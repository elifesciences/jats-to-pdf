import path from 'path';
import { fileURLToPath } from 'url';

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