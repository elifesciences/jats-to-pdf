import puppeteer from 'puppeteer';
import fs from 'fs/promises';

/**
 * Measures tables in the browser and applies layout styles before pagedJS processing.
 * This ensures pagedJS sees correct dimensions when calculating page breaks.
 * @param {string} inputPath - Path to HTML file to measure
 * @param {string} outputPath - Path to write measured HTML
 * @returns {Promise<void>}
 */
export async function measureTablesWithPuppeteer(inputPath, outputPath) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 816, height: 1056 });
    
    // Load the HTML file
    const htmlContent = await fs.readFile(inputPath, 'utf-8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for fonts and styles to load
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Run measurement and get CSS
    const fragmentCSS = await page.evaluate(() => {
      const physicalPageWidth = 816;
      const pageMargins = 100;
      const maxAvailableWidth = physicalPageWidth - pageMargins; // 716px
      const designOffset = 180;
      const standardWidth = maxAvailableWidth - designOffset; // 536px
      
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
        
        const referenceRow = rows.reduce((prev, curr) => 
          curr.children.length > prev.children.length ? curr : prev
        , rows[0]);
        
        const colWidths = [];
        Array.from(referenceRow.children).forEach(cell => {
          const colspan = parseInt(cell.getAttribute('colspan') || '1');
          const width = cell.getBoundingClientRect().width;
          
          if (colspan === 1) {
            colWidths.push(width);
          } else {
            const partWidth = width / colspan;
            for (let i = 0; i < colspan; i++) colWidths.push(partWidth);
          }
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
        
        // Column widths
        colWidths.forEach((width, idx) => {
          const scaledWidth = width * scaleFactor;
          css += `
table#${tableId} tr > *:nth-child(${idx + 1}),
table[data-id="${tableId}"] tr > *:nth-child(${idx + 1}) {
  width: ${scaledWidth}px !important;
  min-width: ${scaledWidth}px !important;
  max-width: ${scaledWidth}px !important;
  box-sizing: border-box !important;
}
`;
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