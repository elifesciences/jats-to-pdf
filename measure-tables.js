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
    
    // Set viewport
    await page.setViewport({ width: 816, height: 1056 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for fonts and images to load
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
    
    // Run measurement and get CSS
    const fragmentCSS = await page.evaluate(() => {
      const physicalPageWidth = 816;
      const pageMargins = 100;
      const maxAvailableWidth = physicalPageWidth - pageMargins; // 716px
      const designOffset = 180;
      const standardWidth = maxAvailableWidth - designOffset; // 536px

      // Maximum height we want images to be in a table cell
      const maxImageHeight = 80;
      
      const tables = document.querySelectorAll('table:not(#funding-table)');
      let css = '';
      
      tables.forEach(table => {
        // Ensure table has ID
        if (!table.id) {
          table.id = `table-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        const tableId = table.id;
        
        // Measure columns from actual rendered table
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) return;

        // First pass: find columns that contain images and calculate
        // their ideal width based on aspect ratio and max height
        const imageColWidths = new Map();
        rows.forEach(row => {
          let colIndex = 0;
          Array.from(row.children).forEach(cell => {
            const colspan = parseInt(cell.getAttribute('colspan') || '1');
            const img = cell.querySelector('img');
            if (img && img.naturalWidth && img.naturalHeight) {
              const aspectRatio = img.naturalWidth / img.naturalHeight;
              // Calculate ideal column width based on aspect ratio and max height
              const idealWidth = Math.ceil((aspectRatio * maxImageHeight)/2);
              // Keep the widest image width for this column
              const existing = imageColWidths.get(colIndex) || 0;
              imageColWidths.set(colIndex, Math.max(existing, idealWidth));
            }
            colIndex += colspan;
          });
        });
        
        // Second pass: measure all column widths, using image-based widths where applicable
        const referenceRow = rows.reduce((prev, curr) => 
          curr.children.length > prev.children.length ? curr : prev
        , rows[0]);
        
        const colWidths = [];
        let colIndex = 0;
        Array.from(referenceRow.children).forEach(cell => {
          const colspan = parseInt(cell.getAttribute('colspan') || '1');
          
          if (colspan === 1 && imageColWidths.has(colIndex)) {
            // Use image-based width for this column
            colWidths.push(imageColWidths.get(colIndex));
          } else {
            // Use measured width
            const width = cell.getBoundingClientRect().width;
            if (colspan === 1) {
              colWidths.push(width);
            } else {
              const partWidth = width / colspan;
              for (let i = 0; i < colspan; i++) colWidths.push(partWidth);
            }
          }
          
          colIndex += colspan;
        });
        
        const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
        
        let marginLeft = 0;
        let scaleFactor = 1;
        let finalWidth = totalWidth;
        
        if (totalWidth > standardWidth) {
          if (totalWidth <= maxAvailableWidth) {
            marginLeft = -(totalWidth - standardWidth);
          } else {
            marginLeft = -designOffset;
            finalWidth = maxAvailableWidth;
            scaleFactor = maxAvailableWidth / totalWidth;
          }
        }
        
        // Generate CSS
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
  width: ${finalWidth}px !important;
  margin-left: ${wrapper ? '0px' : marginLeft + 'px'} !important;
  table-layout: fixed !important;
}
`;
        
        // Table footer - match table width
        css += `
.table-wrap:has(#${tableId}) .table-wrap-foot,
.table-wrap:has(table[data-id="${tableId}"]) .table-wrap-foot {
  width: ${finalWidth}px !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  box-sizing: border-box !important;
}
`;
        
        // Column widths and image sizing based on aspect ratio
        colWidths.forEach((width, idx) => {
          const scaledWidth = width * scaleFactor;
          
          // Calculate image height based on scaled column width and aspect ratio
          const imageHeight = imageColWidths.has(idx)
            ? Math.ceil(scaledWidth / (imageColWidths.get(idx) / maxImageHeight))
            : maxImageHeight;

          css += `
table#${tableId} tr > *:nth-child(${idx + 1}),
table[data-id="${tableId}"] tr > *:nth-child(${idx + 1}) {
  width: ${scaledWidth}px !important;
  min-width: ${scaledWidth}px !important;
  max-width: ${scaledWidth}px !important;
  box-sizing: border-box !important;
}
`;

          // Only add image rules for columns that contain images
          if (imageColWidths.has(idx)) {
            css += `
table#${tableId} tr > *:nth-child(${idx + 1}) img,
table[data-id="${tableId}"] tr > *:nth-child(${idx + 1}) img {
  width: ${scaledWidth}px !important;
  height: ${imageHeight}px !important;
  display: block !important;
  object-fit: contain !important;
}
`;
          }
        });
      });
      
      return css;
    });
    
    // Inject the CSS into the page
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