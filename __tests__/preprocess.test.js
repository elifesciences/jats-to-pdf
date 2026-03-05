/**
 * @jest-environment node
 */
import { TEST_CASE_DIR, TEST_CASES, createToMatchHtml, updateImagePaths } from './test-config.js';
import { preprocess } from '../preprocess.js';
import fs from 'fs';
import path from 'path';
import pretty from 'pretty';

const PREPROCESS_TIMEOUT = 60000;

function normalizePreprocessedHtml(html) {
    return pretty(html, { ocd: true }).trim();
}

expect.extend(
    createToMatchHtml(normalizePreprocessedHtml)
);

describe('Preprocess tests (MathJax rendering + table measurement)', () => {

    test.each(TEST_CASES)(
        'preprocessed HTML for $id (exhibiting $description) should match expected',
        async ({ id }) => {
            const inputPath = path.join(TEST_CASE_DIR, `${id}.expected.html`);
            const expectedPath = path.join(TEST_CASE_DIR, `${id}.expected.preprocessed.html`);
            const actualPath = path.join(TEST_CASE_DIR, `${id}.actual.preprocessed.html`);

            if (!fs.existsSync(inputPath)) throw new Error(`Missing input HTML file: ${inputPath}`);

            const tempInputPath = path.join(TEST_CASE_DIR, `${id}-temp.expected.html`);
            fs.writeFileSync(tempInputPath, updateImagePaths(fs.readFileSync(inputPath, 'utf-8')), 'utf-8');

            await preprocess(tempInputPath, actualPath);

            try { fs.unlinkSync(tempInputPath); } catch (_) {}

            if (!fs.existsSync(actualPath)) throw new Error(`preprocess() did not write output to ${actualPath}`);

            const actualHtml = fs.readFileSync(actualPath, 'utf-8');
            const expectedHtml = fs.readFileSync(expectedPath, 'utf-8');

            try {
                expect(actualHtml).toMatchHtml(expectedHtml);
                try { fs.unlinkSync(actualPath); } catch (_) {}
            } catch (err) {
                console.log(`Test failed — actual output written to ${actualPath}`);
                throw err;
            }
        },
        PREPROCESS_TIMEOUT
    );
});
