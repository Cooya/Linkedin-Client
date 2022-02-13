# Linkedin Client

[![npm version](https://badge.fury.io/js/linkedin-client.svg)](https://badge.fury.io/js/linkedin-client)

This package allows to fetch data about individuals or companies on [Linkedin](https://www.linkedin.com).

## Installation

```bash
npm i linkedin-client
```

## Usage

You need your Linkedin cookie called "**li_at**". This way, requests will be sent on your behalf.  
You can follow [these instructions](https://skwid-prod.s3.eu-west-3.amazonaws.com/resources/linkedin-authentication.mp4) to retrieve your Linkedin session cookie.

```js
const LinkedinClient = require('linkedin-client');

(async () => {
  const client = new LinkedinClient('YOUR_LINKEDIN_COOKIE');
  const data = await client.fetch('https://www.linkedin.com/in/williamhgates/');
  console.log(data);
})();
```

## CLI usage

If you want to retrieve people details :

```bash
node src/cli.js https://www.linkedin.com/in/williamhgates/
```

Or if you want to retrieve company information :

```bash
node src/cli.js https://www.linkedin.com/company/microsoft/
```

## Tests

```bash
npm test
```

## Web interface

If you want to run the web interface on you own, you can do as follows :

```bash
git clone https://github.com/Cooya/Linkedin-Client.git linkedin-client
cd linkedin-client
npm install
npm run build
echo "module.exports = { cookie: 'YOUR_LINKEDIN_COOKIE' };" > config.js
npm start
```

## Context

- Folder _src/v1_ : At the very beginning, the project was a freelance mission for a client needing some leads. I used Linkedin API v1.
- Folder _src/v2_ : After that I decided to design a web interface to showcase the tool. I was limited by the Linkedin API, so I somehow completed it by retrieving data with [Puppeteer](https://github.com/puppeteer/puppeteer), a driver for an headless Google Chrome browser.
- The Linkedin API v1 is now deprecated and the v2 is not really usable so, in this third version, there is no more use of the API and I completely skipped the use of web browser, it is a simple HTTP request and [Cheerio](https://github.com/cheeriojs/cheerio) does the job.
