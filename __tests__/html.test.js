import { compileXsl, xslTransform } from '../server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { diff } from 'jest-diff';
import pretty from 'pretty';

const TIMEOUT = 15000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname);
const TEST_CASE_DIR = path.join(TEST_DIR, 'test-cases');
const TEST_CASES = [
  { id: '001', description: 'a kitchen sink article' },
  { id: '002', description: 'some processing-instruction examples' }
];

const COMPILED_SEF = path.join(__dirname, '..', 'xsl', 'jats-to-html.sef.json');
let COMPILED_STYLESHEET = null;

function normalizeHtml(html) {
  return pretty(html).trim();
}

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

describe('HTML generation tests', () => {

  beforeAll(async () => {
    await compileXsl();
    const sefContent = fs.readFileSync(COMPILED_SEF, 'utf8');
    COMPILED_STYLESHEET = JSON.parse(sefContent);
  });

  test.each(TEST_CASES)(
    'generated HTML for $id (exhibiting $description) should match expected HTML',
    async ({ id }) => {
      const xmlFile = path.join(TEST_CASE_DIR, `${id}.xml`);
      const expectedHtmlFile = path.join(TEST_CASE_DIR, `${id}.expected.html`);

      if (!fs.existsSync(xmlFile)) throw new Error(`Missing XML file: ${xmlFile}`);
      if (!fs.existsSync(expectedHtmlFile)) throw new Error(`Missing expected HTML file: ${expectedHtmlFile}`);

      const xmlInput = fs.readFileSync(xmlFile, 'utf-8');
      const expectedHtml = fs.readFileSync(expectedHtmlFile, 'utf-8');

      const actualHtml = await xslTransform(xmlInput, COMPILED_STYLESHEET);

      try {
        expect(actualHtml).toMatchHtml(expectedHtml);
      } catch (err) {
        const outFile = path.join(TEST_CASE_DIR, `${id}.actual.html`);
        fs.writeFileSync(outFile, actualHtml, 'utf8');
        console.log(`Test failed — wrote actual HTML to ${outFile}`);
        throw err;
      }
    },
    TIMEOUT
  );
});
