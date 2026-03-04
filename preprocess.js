import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function hasMaths(html) {
    return /<math[\s>]/i.test(html);
}

function hasTables(html) {
    const tableMatches = html.match(/<table[^>]*>/g);
    if (!tableMatches) return false;
    return tableMatches.filter(tag => !tag.includes('id="funding-table"')).length > 0;
}

/**
 * Puppeteer preprocessing step: renders MathJax and measures table column widths
 * in a single browser session before pagedjs-cli pdf generation.
 * Maths is rendered before table measurement so that equation widths are
 * accounted for in any tables containing inline maths.
 * @param {string} inputPath
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
export async function preprocess(inputPath, outputPath) {
    const htmlContent = await fs.readFile(inputPath, 'utf-8');
    const mathsPresent = hasMaths(htmlContent);
    const tablesPresent = hasTables(htmlContent);

    if (!mathsPresent && !tablesPresent) {
        console.log('No maths or tables found, skipping preprocessing...');
        await fs.writeFile(outputPath, htmlContent);
        return;
    }

    if (mathsPresent && tablesPresent) {
        console.log('Starting maths rendering and table measurement...');
    } else if (mathsPresent) {
        console.log('Starting maths rendering...');
    } else {
        console.log('Starting Puppeteer table measurement...');
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));
        page.on('response', res => { if (res.status() === 404) console.error('404:', res.url()); });
        await page.setViewport({ width: 816, height: 1056 });

        await page.goto(`file://${path.resolve(inputPath)}`, { waitUntil: 'load' });

        // Step A: Render maths
        if (mathsPresent) {
            const mathJaxPath = path.join(__dirname, 'paged-js', 'js', 'mathjax', 'mml-chtml-nofont.js');

            // Suppress Worker creation — SRE spawns a speech worker eagerly on
            await page.evaluate(() => {
                window.Worker = class {
                    constructor() {}
                    postMessage() {}
                    terminate() {}
                    addEventListener() {}
                    removeEventListener() {}
                };
            });

            // Inject config before the bundle so MathJax picks it up on startup
            await page.evaluate((config) => {
                const el = document.createElement('script');
                el.id = 'MathJax-config';
                el.textContent = config;
                document.head.appendChild(el);
            }, `window.MathJax = {
                options: {
                    enableEnrichment: false,
                    enableExplorer: false,
                    enableSpeech: false,
                    enableBraille: false,
                    menuOptions: {
                        settings: {
                            enrich: false,
                            speech: false,
                            braille: false,
                            assistiveMml: false
                        }
                    }
                },
                startup: {
                    typeset: false
                },
                output: {
                    scale: 0.9,
                    minScale: 0.5,
                    displayOverflow: 'overflow'
                }
            };`);

            // Inject the bundle from disk to avoid no network requests or CDN lookup
            const mathJaxHandle = await page.addScriptTag({ path: mathJaxPath });

            // Wait for startup to complete (enrich: false prevents SRE from blocking it),
            // then typeset manually since startup.typeset is false
            await page.evaluate(async () => {
                await MathJax.startup.promise;
                await MathJax.typesetPromise();
            });

            // Remove script so pagedjs-cli does not re-run MathJax
            await page.evaluate(() => { document.getElementById('MathJax-config')?.remove(); });
            await mathJaxHandle.evaluate(el => el.remove());
        }

        // Step B: Measure tables
        if (tablesPresent) {
            await page.evaluateHandle('document.fonts.ready');
            await page.evaluate(() => {
                return Promise.all(
                    Array.from(document.images)
                        .filter(img => !img.complete)
                        .map(img => new Promise(resolve => {
                            img.onload = resolve;
                            img.onerror = resolve;
                        }))
                );
            });

            const fragmentCSS = await page.evaluate(() => {
                const physicalPageWidth = 816;
                const pageMargins = 100;
                const maxAvailableWidth = physicalPageWidth - pageMargins; // 716px
                const designOffset = 180;
                const standardWidth = maxAvailableWidth - designOffset; // 536px
                const maxImageHeight = 80;
                const maxColumnWidth = 500;

                const tables = document.querySelectorAll('table:not(#funding-table)');
                let css = '';

                tables.forEach(table => {
                    if (!table.id) {
                        table.id = `table-${Math.random().toString(36).substr(2, 9)}`;
                    }
                    const tableId = table.id;

                    const allCells = table.querySelectorAll('td, th');
                    allCells.forEach(cell => cell.style.whiteSpace = 'nowrap');
                    table.offsetHeight; // Force reflow

                    const rows = Array.from(table.querySelectorAll('tr'));
                    if (rows.length === 0) return;

                    // STEP 1: Map the table grid to account for rowspans and colspans
                    const cellMap = [];
                    const grid = [];
                    let maxCols = 0;

                    rows.forEach((row, rowIndex) => {
                        if (!grid[rowIndex]) grid[rowIndex] = [];
                        let colIndex = 0;

                        Array.from(row.children).forEach(cell => {
                            // Skip columns already occupied by a rowspan from above
                            while (grid[rowIndex][colIndex]) {
                                colIndex++;
                            }

                            const colspan = parseInt(cell.getAttribute('colspan') || '1');
                            const rowspan = parseInt(cell.getAttribute('rowspan') || '1');

                            // Mark the grid space as occupied
                            for (let r = 0; r < rowspan; r++) {
                                for (let c = 0; c < colspan; c++) {
                                    if (!grid[rowIndex + r]) grid[rowIndex + r] = [];
                                    grid[rowIndex + r][colIndex + c] = true;
                                }
                            }

                            cellMap.push({ cell, rowIndex, colIndex, colspan, rowspan });
                            maxCols = Math.max(maxCols, colIndex + colspan);
                            colIndex += colspan;
                        });
                    });

                    // STEP 2: Measure column widths based on our accurate grid map
                    const columnWidths = new Array(maxCols).fill(0);
                    const colspanCells = [];

                    cellMap.forEach(({ cell, colIndex, colspan }) => {
                        let cellWidth = cell.getBoundingClientRect().width;

                        const img = cell.querySelector('img');
                        if (img && img.naturalWidth && img.naturalHeight && colspan === 1) {
                            const aspectRatio = img.naturalWidth / img.naturalHeight;
                            const calculatedImgWidth = Math.ceil(aspectRatio * maxImageHeight);
                            cellWidth = Math.max(cellWidth, calculatedImgWidth);
                        }

                        if (colspan === 1) {
                            columnWidths[colIndex] = Math.max(columnWidths[colIndex], cellWidth);
                        } else {
                            colspanCells.push({ cell, colIndex, colspan, cellWidth });
                        }
                    });

                    // STEP 3: Distribute colspan widths proportionally
                    colspanCells.sort((a, b) => a.colspan - b.colspan);
                    colspanCells.forEach(({ colIndex, colspan, cellWidth }) => {
                        let cumulativeWidth = 0;
                        for (let c = 0; c < colspan; c++) {
                            cumulativeWidth += columnWidths[colIndex + c];
                        }

                        if (cellWidth > cumulativeWidth) {
                            const extraWidth = cellWidth - cumulativeWidth;
                            if (cumulativeWidth > 0) {
                                for (let c = 0; c < colspan; c++) {
                                    const ratio = columnWidths[colIndex + c] / cumulativeWidth;
                                    columnWidths[colIndex + c] += (extraWidth * ratio);
                                }
                            } else {
                                const widthPerCol = extraWidth / colspan;
                                for (let c = 0; c < colspan; c++) {
                                    columnWidths[colIndex + c] += widthPerCol;
                                }
                            }
                        }
                    });

                    // Enforce max column width
                    for (let i = 0; i < columnWidths.length; i++) {
                        columnWidths[i] = Math.min(columnWidths[i], maxColumnWidth);
                    }

                    // STEP 3.5: Measure minimum content widths (longest word per column)
                    const minColumnWidths = new Array(maxCols).fill(0);

                    allCells.forEach(cell => {
                        cell.style.whiteSpace = 'normal';
                        cell.style.width = '1px';
                    });
                    table.offsetHeight;

                    cellMap.forEach(({ cell, colIndex, colspan }) => {
                        const minWidth = cell.getBoundingClientRect().width;

                        if (colspan === 1) {
                            minColumnWidths[colIndex] = Math.max(minColumnWidths[colIndex], minWidth);
                        } else {
                            const minPerCol = minWidth / colspan;
                            for (let c = 0; c < colspan; c++) {
                                minColumnWidths[colIndex + c] = Math.max(minColumnWidths[colIndex + c], minPerCol);
                            }
                        }
                    });

                    // Enforce max on minimums too
                    for (let i = 0; i < minColumnWidths.length; i++) {
                        minColumnWidths[i] = Math.min(minColumnWidths[i], maxColumnWidth);
                    }

                    // Reset cells
                    allCells.forEach(cell => {
                        cell.style.whiteSpace = 'nowrap';
                        cell.style.width = '';
                    });
                    table.offsetHeight;

                    // STEP 4: Attempt scale down if table exceeds max available width
                    let totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);
                    let fontSizeScale = 1;

                    if (totalWidth > maxAvailableWidth) {
                        const scaleFactor = maxAvailableWidth / totalWidth;

                        // Apply scaling but enforce minimum content widths
                        for (let i = 0; i < columnWidths.length; i++) {
                            const scaledWidth = columnWidths[i] * scaleFactor;
                            columnWidths[i] = Math.max(scaledWidth, minColumnWidths[i]);
                        }

                        totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);

                        // If still too wide after enforcing minimums, reduce font size and scale columns
                        if (totalWidth > maxAvailableWidth) {
                            fontSizeScale = maxAvailableWidth / totalWidth;
                            for (let i = 0; i < columnWidths.length; i++) {
                                columnWidths[i] = columnWidths[i] * fontSizeScale;
                            }
                            totalWidth = maxAvailableWidth;
                        }
                    }

                    // STEP 5: Inject Colgroup directly into HTML
                    const existingColgroup = table.querySelector('colgroup');
                    if (existingColgroup) existingColgroup.remove();

                    const colgroup = document.createElement('colgroup');
                    columnWidths.forEach(width => {
                        const col = document.createElement('col');
                        col.style.width = `${width}px`;
                        colgroup.appendChild(col);
                    });
                    table.insertBefore(colgroup, table.firstChild);

                    // STEP 6: Apply inline image styles using exact grid data
                    cellMap.forEach(({ cell, colIndex, colspan }) => {
                        const img = cell.querySelector('img');
                        if (img && colspan === 1) {
                            const aspectRatio = img.naturalWidth / img.naturalHeight;
                            const colWidth = columnWidths[colIndex];
                            const widthByMaxHeight = aspectRatio * maxImageHeight;
                            const finalWidth = Math.min(colWidth, widthByMaxHeight);
                            const finalHeight = finalWidth / aspectRatio;

                            img.style.width = `${finalWidth}px`;
                            img.style.height = `${finalHeight}px`;
                            img.style.display = 'block';
                            img.style.margin = '0 auto';
                            img.style.objectFit = 'contain';
                        }
                    });

                    // STEP 7: Generate Base CSS for margins and word-wrapping
                    let marginLeft = totalWidth > standardWidth ? -(totalWidth - standardWidth) : 0;
                    const captionWidth = Math.max(standardWidth, totalWidth);
                    const wrapper = table.closest('.table-wrap');

                    if (wrapper) {
                        css += `
.table-wrap:has(#${tableId}),
.table-wrap:has(table[data-id="${tableId}"]) {
  margin-left: ${marginLeft}px !important;
  position: relative !important;
}
`;
                    }

                    css += `
table#${tableId},
table[data-id="${tableId}"] {
  width: ${totalWidth}px !important;
  margin-left: ${wrapper ? '0px' : marginLeft + 'px'} !important;
  table-layout: fixed !important;
  font-size: calc(0.8em * ${fontSizeScale}) !important;
}

table#${tableId} td,
table#${tableId} th,
table[data-id="${tableId}"] td,
table[data-id="${tableId}"] th {
  box-sizing: border-box !important;
  white-space: normal !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
}

.table-wrap:has(#${tableId}) .table-wrap-foot,
.table-wrap:has(table[data-id="${tableId}"]) .table-wrap-foot {
  width: ${totalWidth}px !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  box-sizing: border-box !important;
}

.table-wrap:has(#${tableId}) .table__caption {
  width: ${captionWidth}px !important;
  max-width: ${captionWidth}px !important;
  margin-left: 0 !important;
  box-sizing: border-box !important;
}
`;
                });

                return css;
            });

            await page.evaluate((css) => {
                const style = document.createElement('style');
                style.id = 'puppeteer-table-measurements';
                style.textContent = css;
                document.head.appendChild(style);
            }, fragmentCSS);
        }

        const html = await page.content();
        await fs.writeFile(outputPath, html);
    } finally {
        await browser.close();
    }
}
