import path from 'path';
import { fileURLToPath } from 'url';
import { diff } from 'jest-diff';

export const TIMEOUT = 15000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const TEST_DIR = path.resolve(__dirname);
export const TEST_CASE_DIR = path.join(TEST_DIR, 'test-cases');

export const TEST_CASES = [
    { id: '001', description: 'a kitchen sink article' },
    { id: '002', description: 'some processing-instruction examples' }
];

export function createToMatchHtml(normalizedHtml) {
    return {
        toMatchHtml(received, expected) {
            const actualNorm = normalizedHtml(received);
            const expectedNorm = normalizedHtml(expected);

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
    };
}

/* Extract an ordered list of text blocks from across all pages of a PagedJS HTML output.
   Each block is a [tagName, text] tuple representing a leaf-level block element.
   By comparing these flat lists rather than DOM structure, we assert that all content
   is present and in order without caring which page anything fell on. */
export function extractPageTextBlocks(html) {
    const document = new DOMParser().parseFromString(html, 'text/html');

    // Remove split clones
    document.querySelectorAll('[data-split-from]').forEach(el => el.remove());

    const blocks = [];
    const blockSelector = 'h1, h2, h3, h4, h5, h6, p, li, td, th, figcaption';

    document.querySelectorAll('.pagedjs_page_content').forEach(page => {
        page.querySelectorAll(blockSelector).forEach(el => {
            if (el.querySelector(blockSelector)) return;
            const text = el.textContent.trim().replace(/\s+/g, ' ');
            if (text) blocks.push([el.tagName.toLowerCase(), text]);
        });

        // Capture figures by their position in document order
        page.querySelectorAll('figure').forEach(() => {
            blocks.push(['figure']);
        });
    });

    return blocks;
}
