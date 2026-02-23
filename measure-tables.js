import puppeteer from 'puppeteer';
import fs from 'fs/promises';

/**
 * Checks if an HTML file contains any tables (excluding #funding-table).
 * @param {string} html - HTML string to check
 * @returns {boolean} True if article contains non-funding tables
 */
function hasTables(html) {
  const tableMatches = html.match(/<table[^>]*>/g);
  if (!tableMatches) return false;
  return tableMatches.filter(tag => !tag.includes('id="funding-table"')).length > 0;
}


/**
 * Measures tables in the browser and applies layout styles before pagedJS processing.
 * This ensures pagedJS sees correct dimensions when calculating page breaks.
 * @param {string} inputPath - Path to HTML file to measure
 * @param {string} outputPath - Path to write measured HTML
 * @returns {Promise<void>}
 */
export async function measureTablesWithPuppeteer(inputPath, outputPath) {
  const htmlContent = await fs.readFile(inputPath, 'utf-8');

  // Skip Puppeteer entirely if no relevant tables exist
  if (!hasTables(htmlContent)) {
    console.log('No tables found, skipping Puppeteer table measurement...');
    await fs.copyFile(inputPath, outputPath);
    return;
  }
  
  console.log("Starting Puppeteer table measurement...");
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
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
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
        
        // STEP 4: Attempt scale down if table exceeds max available width
        let totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);
        if (totalWidth > maxAvailableWidth) {
          const scaleFactor = maxAvailableWidth / totalWidth;
          for (let i = 0; i < columnWidths.length; i++) {
            columnWidths[i] = columnWidths[i] * scaleFactor;
          }
          totalWidth = maxAvailableWidth;
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
    
    const modifiedHTML = await page.content();
    await fs.writeFile(outputPath, modifiedHTML);
    
  } finally {
    await browser.close();
  }
}