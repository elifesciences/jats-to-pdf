import { TIMEOUT, PROJECT_ROOT, TEST_CASE_DIR, TEST_CASES, createToMatchHtml } from './test-config.js';
import { compileXsl, xslTransform } from '../server.js';
import fs from 'fs';
import path from 'path';
import pretty from 'pretty';

const COMPILED_SEF = path.join(PROJECT_ROOT, 'xsl', 'jats-to-html.sef.json');
let COMPILED_STYLESHEET = null;

function normalizeXslHtml(html) {
  return pretty(html).trim();
}

expect.extend(
  createToMatchHtml(normalizeXslHtml)
);

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
      } finally {
        try {
          fs.unlinkSync(COMPILED_SEF)
        } catch (err) { }
      }
    },
    TIMEOUT
  );
});
