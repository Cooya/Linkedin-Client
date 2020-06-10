# Linkedin scraper

This service allows to fetch data about individuals or companies on [Linkedin](https://www.linkedin.com).

![app screenshot](https://cooya.fr/images/screenshots/linkedin-company.png)

## Demo
You can try out the tool on my personal server [here](https://linkedin.cooya.fr). Remember this is only a showcase website.

## Context
- Folder _src/v1_ : At the very beginning, the project was a freelance mission for a client needing some leads. I used Linkedin API v1.
- Folder _src/v2_ : After that I decided to design a web interface to showcase the tool, which might be useful for other people. I was limited by the Linkedin API, so I somehow completed it by scraping data with [Puppeteer](https://github.com/puppeteer/puppeteer), a driver for an headless Google Chrome browser.
- The Linkedin API v1 is now deprecated and the v2 is not really usable so, in this third version, there is no more use of the API and I completely skipped the use of web browser, it is a simple HTTP request and [Cheerio](https://github.com/cheeriojs/cheerio) does the job.

## Installation
Want to try running it on you own ? You will need your Linkedin cookie called "**li_at**". This way, requests will be sent on your behalf.
```bash
git clone https://github.com/Cooya/Linkedin.git linkedin
cd linkedin
npm install
npm run build
touch config.js
npm start
```

Complete the configuration file "config.js" as follows :
```js
module.exports = {
    cookie: 'YOUR_LINKEDIN_COOKIE'
};
```

## CLI usage
If you want to scrap people details :
```bash
node src/cli.js https://www.linkedin.com/in/williamhgates/
```
Or if you want to scrap company information :
```bash
node src/cli.js https://www.linkedin.com/company/microsoft/
```

## Tests
```bash
npm test
```
