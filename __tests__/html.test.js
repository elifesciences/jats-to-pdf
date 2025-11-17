import { compileXsl, transform } from '../server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const TIMEOUT = 15000
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.resolve(__dirname);
const TEST_CASES = [
  { id: '001', description: 'Kitchen sink article' },
  { id: '002', description: 'Testing processing-instruction functionality' }
];

const COMPILED_SEF = path.join(__dirname, '..', 'xsl', 'jats-to-html.sef.json');
let COMPILED_STYLESHEET = null;

function domEqual(aHtml, bHtml) {
  const parser = new DOMParser();
  const a = parser.parseFromString(aHtml, "text/html");
  const b = parser.parseFromString(bHtml, "text/html");
  return a.documentElement.isEqualNode(b.documentElement);
}

describe('HTML generation tests', () => {

  beforeAll(async () => {
    await compileXsl();
    const sefContent = fs.readFileSync(COMPILED_SEF, 'utf8');
    COMPILED_STYLESHEET = JSON.parse(sefContent);
  });

  TEST_CASES.forEach(({ id }) => {
    const xmlPath = path.join(TEST_DIR, `${id}.xml`);
    const htmlPath = path.join(TEST_DIR, `${id}.expected.html`);
    if (!fs.existsSync(xmlPath)) throw new Error(`Missing XML file: ${xmlPath}`);
    if (!fs.existsSync(htmlPath)) throw new Error(`Missing expected HTML file: ${htmlPath}`);
  });

  test.each(TEST_CASES)(
    '$description should transform $id correctly into HTML',
    async ({ id, description }) => {
      const xmlFile = path.join(TEST_DIR, `${id}.xml`);
      const expectedHtmlFile = path.join(TEST_DIR, `${id}.expected.html`);
      const xmlInput = fs.readFileSync(xmlFile, 'utf-8');
      const expectedHtml = fs.readFileSync(expectedHtmlFile, 'utf-8');
      const actualHtml = await transform(xmlInput, COMPILED_STYLESHEET);

      expect(domEqual(actualHtml, expectedHtml)).toBe(true);
    },
    TIMEOUT
  );
});