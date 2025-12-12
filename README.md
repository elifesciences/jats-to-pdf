# JATS to PDF

A two-step conversion pipeline:
1. JATS XML -> HTML  (via XSLT)
2.    HTML  -> PDF   (via paged-js)

## Getting Started

### Docker

```bash
docker compose up
```

Will start the application in port 3000.

### Node

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm start
```

Run the test suite:

```bash
npm test
```

## Using the service

Post XML to the endpoint (specifying the output path for the PDF), e.g.:

```bash
curl -X POST -H 'Content-Type: application/xml' --data-binary @"./test.xml" http://localhost:3000/ -o "./output.pdf"
```

#### Note

This app is developed with production-ready eLife Reviewed preprint XML in mind (available publicly at [elifesciences/elife-article-xml/preprints](https://github.com/elifesciences/elife-article-xml/tree/master/preprints)). In its current state other XML may produce unintended results.