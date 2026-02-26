import { TIMEOUT, PROJECT_ROOT, TEST_CASE_DIR, TEST_CASES, extractPageTextBlocks } from './test-config.js';
import { generatePDF } from '../server.js';
import fs from 'fs';
import path from 'path';

// Replace 'real' images in test case HTML with placeholder
function updateImagePaths(htmlString) {
  const placeholderPath = './assets/placeholder-for-testing.png';
  const regex = /(<img[^>]*?src=["'])(.*?)(["'][^>]*?>)/gi;
  const replacement = `$1${placeholderPath}$3`;
  return htmlString.replace(regex, replacement);
};

expect.extend({
  toMatchPageContent(received, expected) {
    const actualBlocks = extractPageTextBlocks(received);
    const expectedBlocks = extractPageTextBlocks(expected);
    const pass = JSON.stringify(actualBlocks) === JSON.stringify(expectedBlocks);
    return {
      pass,
      message: () => pass
        ? 'Expected page content not to match'
        : `Expected page content to match.\n\nExpected blocks:\n${JSON.stringify(expectedBlocks, null, 2)}\n\nReceived blocks:\n${JSON.stringify(actualBlocks, null, 2)}`,
    };
  }
});


describe('PDF generation tests (pagedjs HTML output)', () => {

  test.each(TEST_CASES)(
    'generated PDF-ready HTML for $id (exhibiting $description) should match expected PDF-ready HTML',
    async ({ id }) => {
      const inputFilePath = path.join(TEST_CASE_DIR, `${id}.expected.html`);
      const expectedHtmlFile = path.join(TEST_CASE_DIR, `${id}.expected.pdf.html`);

      if (!fs.existsSync(inputFilePath)) throw new Error(`Missing input HTML file: ${inputFilePath}`);
      if (!fs.existsSync(expectedHtmlFile)) throw new Error(`Missing expected HTML file: ${expectedHtmlFile}`);

      // For pagedjs to load the styles, this needs to be copied into the root/paged-js folder(!)
      const tempInputFilePath = path.join(PROJECT_ROOT, 'paged-js', `${id}-temp.expected.html`);
      const tempInputHtml = updateImagePaths(fs.readFileSync(inputFilePath, 'utf-8'));
      fs.writeFileSync(tempInputFilePath, tempInputHtml, 'utf-8');

      const expectedHtml = updateImagePaths(fs.readFileSync(expectedHtmlFile, 'utf-8'));
      const actualHtmlPath = path.join(TEST_CASE_DIR, `${id}.actual.pdf.html`);

      await generatePDF(tempInputFilePath, actualHtmlPath, true);

      if (!fs.existsSync(actualHtmlPath)) throw new Error(`Error generating PDF-ready HTML file: ${actualHtmlPath}`);
      const actualHtml = fs.readFileSync(actualHtmlPath, 'utf-8');

      try {
        expect(actualHtml).toMatchPageContent(expectedHtml);
        try {
          fs.unlinkSync(actualHtmlPath)
        } catch (err) { }
      } catch (err) {
        console.log(`Test failed. Generated file located at: ${actualHtmlPath}`);
        throw err;
      } finally {
        try {
          fs.unlinkSync(tempInputFilePath)
        } catch (err) { }
      }
    },
    TIMEOUT
  );
});
