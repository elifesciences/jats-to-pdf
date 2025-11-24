import { generatePDF } from '../server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { diff } from 'jest-diff';
import pretty from 'pretty';

const TIMEOUT = 15000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEST_CASE_DIR = path.join(TEST_DIR, 'test-cases');
const TEST_CASES = [
  { id: '001', description: 'a kitchen sink article' },
  { id: '002', description: 'some processing-instruction examples' }
];

function normalizeHtml(html) {
    // remove data-..., id, and empty class attributes
    let cleaned = html.replace(/\sdata-\w+=\".*?\"/g, '');
    cleaned = cleaned.replace(/\sid=\".*?\"/g, '');
    cleaned = cleaned.replace(/\sclass=\"\"/g, '');
    return pretty(cleaned).trim();
};

expect.extend({
  toMatchHtml(received, expected) {
    const actualNorm = normalizeHtml(received);
    const expectedNorm = normalizeHtml(expected);

    if (actualNorm === expectedNorm) {
      return { pass: true, message: () => '' };
    }

    const diffOutput = diff(expectedNorm, actualNorm, {
      expand: false,
      contextLines: 2
    });

    return {
      pass: false,
      message: () =>
        `HTML mismatch (expected vs actual):\n\n${diffOutput}`
    };
  },
});

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
            try {} 
            catch (err) {}
        } catch (err) {
            console.log(`Test failed`);
            throw err;
        } finally {
            try {
                fs.unlinkSync(actualHtmlPath)
                fs.unlinkSync(tempInputFile)
            } catch (err) {}
        }
    },
    TIMEOUT
  );
});
