import { TIMEOUT, PROJECT_ROOT, TEST_CASE_DIR, TEST_CASES, createToMatchHtml } from './test-config.js';
import { generatePDF } from '../server.js';
import fs from 'fs';
import path from 'path';

// remove script tags, remove data-..., id, and empty class attributes
function normalizePdfHtml(html) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script, style').forEach(el => el.remove());
  const cleanTree = root => {
    root.querySelectorAll('*').forEach(element => {
      [...element.attributes].forEach(attr => {
        if (attr.name.startsWith('data-')) {
          element.removeAttribute(attr.name);
        }
      });
      element.removeAttribute('id');
      if (element.hasAttribute('class') && element.classList.length === 0) {
        element.removeAttribute('class');
      }
    });
  };
  cleanTree(document);
  document.querySelectorAll('template').forEach(template => {
    cleanTree(template.content);
  });
  const serializer = new XMLSerializer();
  const cleaned = serializer.serializeToString(document.body);
  return cleaned.trim();
};

expect.extend(
  createToMatchHtml(normalizePdfHtml)
);

describe('PDF generation tests (pagedjs HTML output)', () => {

  test.each(TEST_CASES)(
    'generated PDF-ready HTML for $id (exhibiting $description) should match expected PDF-ready HTML',
    async ({ id }) => {
      const inputFilePath = path.join(TEST_CASE_DIR, `${id}.expected.html`);
      const expectedHtmlFile = path.join(TEST_CASE_DIR, `${id}.pdf.expected.html`);

      if (!fs.existsSync(inputFilePath)) throw new Error(`Missing input HTML file: ${inputFilePath}`);
      if (!fs.existsSync(expectedHtmlFile)) throw new Error(`Missing expected HTML file: ${expectedHtmlFile}`);

      // For pagedjs to load the styles, this needs to be copied into the root/paged-js folder(!)
      const tempInputFile = path.join(PROJECT_ROOT, 'paged-js', `${id}-temp.expected.html`);
      fs.copyFileSync(inputFilePath, tempInputFile);

      const expectedHtml = fs.readFileSync(expectedHtmlFile, 'utf-8');
      const actualHtmlPath = path.join(TEST_CASE_DIR, `${id}.pdf.actual.html`);

      await generatePDF(tempInputFile, actualHtmlPath, true);

      if (!fs.existsSync(actualHtmlPath)) throw new Error(`Error generating PDF-ready HTML file: ${actualHtmlPath}`);
      const actualHtml = fs.readFileSync(actualHtmlPath, 'utf-8');

      try {
        expect(actualHtml).toMatchHtml(expectedHtml);
        try {
          fs.unlinkSync(actualHtmlPath)
        } catch (err) { }
      } catch (err) {
        console.log(`Test failed. Generated file located at: ${actualHtmlPath}`);
        throw err;
      } finally {
        try {
          fs.unlinkSync(tempInputFile)
        } catch (err) { }
      }
    },
    TIMEOUT
  );
});
