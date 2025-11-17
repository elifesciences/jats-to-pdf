/* --- JATS XML to PDF Conversion ---
This server exposes a POST endpoint to receive XML, 
and runs a two-stage pipeline:
 [JATS XML]  --->  [HTML] (via xslt in saxon-js)
   [HTML]    --->   [PDF] (via paged-js cli)
to return a PDF
*/

import express, { text as expressText } from 'express';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import SaxonJS from 'saxon-js';

const { readFileSync, mkdirSync, existsSync, writeFileSync, createReadStream, unlinkSync } = fs;
const { dirname, join } = path;
const { fileSync } = tmp;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

const XSL_STYLESHEET = join('xsl', 'jats-to-html.xsl');
const COMPILED_SEF = join('xsl', 'jats-to-html.sef.json');
let COMPILED_STYLESHEET = null;

const ADDITIONAL_SCRIPTS = [
    join('paged-js', 'js', 'csstree.js'),
    join('paged-js', 'js', 'elife-custom-scripts.js'),
    join('paged-js', 'js', 'pagedjs-fill-page.js'),
    join('paged-js', 'js', 'pagedjs-plugin-baseline.js'),
];
const MAIN_CSS = join('paged-js', 'print.css');

async function initializeAssets() {
    const requiredFiles = [...ADDITIONAL_SCRIPTS, ...MAIN_CSS];
    requiredFiles.forEach(filePath => {
        const dir = dirname(filePath);
        if (dir !== '.') {
            mkdirSync(dir, { recursive: true });
        }
    });
    if (!existsSync(XSL_STYLESHEET)) {
        console.error(`\nCritical error: XSL file not found at: ${XSL_STYLESHEET}`);
        process.exit(1);
    }
    try {
        console.log("Compiling XSLT Stylesheet to SEF...");
        await compileXsl();
        console.log("XSL Compilation successful.");
    } catch (e) {
        console.error(`\nCritical XSL compilation error: ${e.message}`);
        process.exit(1);
    }
    try {
        const sefContent = readFileSync(COMPILED_SEF, 'utf8');
        COMPILED_STYLESHEET = JSON.parse(sefContent);
    } catch (e) {
        console.error(`\nCRITICAL ERROR: Failed to load or parse SEF file (${COMPILED_SEF}): ${e.message}. Shutting down.`);
        process.exit(1);
    }
}

function compileXsl() {
    return new Promise((resolve, reject) => {
        const cliPath = join(__dirname, 'node_modules', '.bin', 'xslt3');
        const command = `${cliPath} -xsl:${XSL_STYLESHEET} -export:${COMPILED_SEF} -nogo`;

        exec(command, (error, stdout, stderr) => { 
            if (error) {
                console.error(`xslt3 CLI compilation failed: ${error.message}`);
                console.error(`Stdout: ${stdout}`);
                console.error(`Stderr: ${stderr}`);
                return reject(new Error(`XSLT compilation failed`));
            }
            if (stderr) {
                console.warn(`xslt3 CLI warnings:\n${stderr}`);
            }
            resolve();
        });
    });
}

/**
 * Runs the XSL transformation to convert XML to HTML
 * @param {string} xmlContent
 * @param {string} xslPath
 * @returns {Promise<string>}
 */
function transform(xmlContent) {
    return new Promise((resolve, reject) => {
        try {
            const result = SaxonJS.transform({
                stylesheetInternal: COMPILED_STYLESHEET,
                sourceText: xmlContent,
                destination: "serialized"
            }, "sync");

            if (result.errorMessage) {
                 reject(new Error(`Saxon-JS Error: ${result.errorMessage}`));
                 return;
            }

            resolve(result.principalResult);

        } catch (error) {
            reject(new Error(`XSLT Transformation Failed: ${error.message}`));
        }
    });
}

/**
 * Runs the paged-js CLI to convert HTML to PDF
 * @param {string} htmlPath
 * @param {string} pdfPath
 * @returns {Promise<void>}
 */
function generatePDF(htmlPath, pdfPath) {
    return new Promise((resolve, reject) => {
        const cliPath = join(__dirname, 'node_modules', '.bin', 'pagedjs-cli');
        const scripts = ADDITIONAL_SCRIPTS.map(s => `--additional-script ${join(__dirname, s)}`).join(' ');
        const styles = `--style ${join(__dirname, MAIN_CSS)}`;
        const command = `${cliPath} ${htmlPath} ${scripts} ${styles} -o ${pdfPath}`;

        console.log(`Running Paged.js CLI: ${command}`);
        exec(command, { maxBuffer: 1024 * 5000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Paged.js CLI failed: ${error.message}`);
                console.error(`Stdout: ${stdout}`);
                console.error(`Stderr: ${stderr}`);
                return reject(new Error(`PDF Generation Failed: ${error.message}`));
            }
            if (stderr) {
                console.warn(`Paged.js CLI warnings:\n${stderr}`);
            }
            resolve();
        });
    });
}

function cleanupFiles(filesToClean) {
     filesToClean.filter(f => f && existsSync(f));
     filesToClean.forEach(f => {
         try {
            unlinkSync(f);
         } catch (e) {
            console.error(`Failed to clean up file ${f}: ${e.message}`);
         }
     });
}

app.use(expressText({ type: 'application/xml', limit: '5mb' }));

app.post('/', async (req, res) => {
    if (!req.body) {
        return res.status(400).send({ error: 'No XML content provided in the request body.' });
    }
    if (typeof req.body !== 'string' || req.body.length === 0) {
        return res.status(400).send({ error: 'Input must be a non-empty XML document.' });
    }

    const xmlContent = req.body;
    let tempXML = null;
    let tempHTML = null;
    let tempPDF = null;

    try {
        tempXML = fileSync({ prefix: 'input-', postfix: '.xml', keep: false }).name;
        const pagedJsPath = join(__dirname, 'paged-js');
        const jobId = Math.random().toString(36).substring(2, 8); 
        tempHTML = join(pagedJsPath, `output-${jobId}.html`); 
        tempPDF = fileSync({ prefix: 'final-', postfix: '.pdf', keep: true }).name;

        console.log("Starting XSLT transformation...");
        const htmlContent = await transform(xmlContent, XSL_STYLESHEET);
        writeFileSync(tempHTML, htmlContent);
        console.log(`HTML written to ${tempHTML}`);

        console.log("Starting PDF generation...");
        await generatePDF(tempHTML, tempPDF);
        console.log(`PDF successfully generated to ${tempPDF}`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=document.pdf');
        
        const pdfStream = createReadStream(tempPDF);
        pdfStream.pipe(res);

        pdfStream.on('close', () => cleanupFiles([tempXML, tempHTML, tempPDF]));


    } catch (error) {
        console.error("Pipeline error:", error.message);
        res.status(500).send({ error: `Conversion pipeline failed: ${error.message}` });
        cleanupFiles([tempXML, tempHTML, tempPDF])
    }
});

async function startServer() {
    try {
        await initializeAssets(); 
        app.listen(port, () => {
            console.log(`PDF Conversion Service listening on port ${port}`);
            console.log(`POST XML to http://localhost:${port}/ to start conversion.`); 
        });
    } catch (error) {
        console.error("Server failed to start:", error.message);
        process.exit(1);
    }
}

startServer();

export { compileXsl, transform };