const puppeteer = require('puppeteer');

const linkedin = require('./linkedin');

const startingPointUrl = 'https://www.linkedin.com/in/nicomarcy/';
const peopleToVisit = [startingPointUrl];
const index = 0;

const browserOptions = {
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ],
    headless: true
};

async function main() {
    let peopleDetails;
    const browser = await puppeteer.launch(browserOptions);

    while(index < peopleToVisit.length) {
        peopleDetails = await linkedin.getPeopleDetails(peopleToVisit[index]);

    }

    await browser.close();
}