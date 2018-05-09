const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const csv = require('./csv.js');
const puppeteer = require('puppeteer');

const browserOptions = {
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ],
    headless: false
};

/*(async () => {
    const config = require('./assets/config.json');

    const browser = await puppeteer.launch(browserOptions);
    const page = await createPage(browser, config.cookiesFile);
    await page.waitFor(60000);
    await saveCookies(page, config.cookiesFile);
    await browser.close();
})();*/

(async () => {
    const config = require('./assets/config.json');

    // load entries from csv file
    const entries = (await csv.readFile(config.csvFile));
    console.log(entries.length + ' entries to process.');

    // process entries
    const browser = await puppeteer.launch(browserOptions);
    await processEntries(browser, entries, config.csvFile, config.cookiesFile, config.screenshotFile);
    await browser.close();

    // saving updated entries into csv file
    await csv.writeFile(config.csvFile, entries);
    console.log('Process done.');
})();

async function processEntries(browser, entries, csvFile, cookiesFile, screenshotFile) {
    let page = null;
    let companyLink;
    let companyDetails;
    let entry;
    for(let i in entries) {
        entry = entries[i];
        console.log('Processing entry', i, '...');

        if(entry[5] || entry[6]) {
            console.log('Skipping already processed entry.');
            continue; // skip the already processed entries
        }

        if(!page)
            page = await createPage(browser, cookiesFile);

        console.log('Going to %s...', entry[3]);
        while(true) {
            try {
                await page.goto(entry[3]);
                break;
            }
            catch(e) {
                console.log(e);
            }
        }

        console.log('Scrolling the page...');
        //await page.waitFor('span.org > a');
        let scrollAgain = true;
        let counter = 0;
        let jsInstruction;
        while(scrollAgain) {
            jsInstruction = ++counter % 2 ? 'window.scrollTo(0, document.body.scrollHeight / 2)' : 'window.scrollTo(0, 0)';
            await page.evaluate(jsInstruction);
            try {
                await page.waitForSelector('#experience-section', {timeout: 2000});
                scrollAgain = false;
            }
            catch(e) {
                console.log('exception !')
            }
        }
        // wait a bit to prevent robot detection
        console.log('Waiting for 30000ms.');
        await page.waitFor(30000);// 2 sec minimum required otherwise it does not work very well

        // get the link of the company
        companyLink = await page.$('#experience-section > ul > li:nth-child(1) a.ember-view');
        //companyLink = await page.$('span.org > a');
        if (!companyLink)
            throw Error('Cannot find the company link.');

        // going to the company page
        const navigationPromise = page.waitForNavigation();
        //await companyLink.click();
        await page.evaluate((el) => {
            el.click();
        }, companyLink);
        await navigationPromise;

        // getting details about the company
        if(page.url().indexOf('https://www.linkedin.com/search/results/index/') !== -1)
            entries[i][5] = 'No company URL available';
        else {
            companyDetails = await scrapCompanyPage(page);
            entries[i][5] = companyDetails['headquarters'] || 'Unknown';
            entries[i][6] = companyDetails['companySize'] || 'Unknown';
        }

        // saving the retrieved details in the csv file
        console.log('Saving last processed entry...');
        await csv.writeFile(csvFile, entries);
    }
}

async function scrapCompanyPage(page, pageUrl = null) {
    if(pageUrl)
        await page.goto(pageUrl);
    await page.waitFor('#org-about-company-module__show-details-btn');
    await page.click('#org-about-company-module__show-details-btn');
    await page.waitForSelector('div.org-about-company-module__about-us-extra');
    return await page.evaluate(() => {
        const companyDetails = {};
        companyDetails['name'] = $('h1.org-top-card-module__name').text().trim();
        companyDetails['description'] = $('p.org-about-us-organization-description__text').text().trim();
        companyDetails['website'] = $('a.org-about-us-company-module__website').text().trim();
        companyDetails['headquarters'] = $('p.org-about-company-module__headquarters').text().trim();
        companyDetails['foundedYear'] = $('p.org-about-company-module__founded').text().trim();
        companyDetails['companyType'] = $('p.org-about-company-module__company-type').text().trim();
        companyDetails['companySize'] = $('p.org-about-company-module__company-staff-count-range').text().trim();
        return companyDetails;
    });
}

async function createPage(browser, cookiesFile) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0');
    await loadCookies(page, cookiesFile);
    return page;
}

async function logIn(page, login, password) {
    console.log('Logging in...');
    await page.evaluate((login, password) => {
        document.querySelector('#login-email').value = login;
        document.querySelector('#login-password').value = password;
        document.querySelector('form.login-form').submit();
        //document.querySelector('#login-submit').click();
    }, login, password);
    console.log('Logged in.');
}

async function loadCookies(page, cookiesFile) {
    console.log('Loading cookies...');
    let cookies;
    try {
        cookies = await readFile(cookiesFile);
    }
    catch(e) {
        return console.log('Cookies file does not exist.');
    }
    await page.setCookie(...JSON.parse(cookies));
    console.log('Cookies loaded.');
}

async function saveCookies(page, cookiesFile) {
    console.log('Saving cookies...');
    const cookies = JSON.stringify(await page.cookies());
    await writeFile(cookiesFile, cookies);
    console.log('Cookies saved.');
}

async function deleteCookiesFile(cookiesFile) {
    const fileExists = await fs.exists(cookiesFile);
    if(!fileExists)
        return console.log('Cookies file does not exist.');
    await fs.unlink(cookiesFile);
    console.log('Cookies file deleted.');
}

async function getValue(page, selector) {
    return await page.evaluate((selector) => {
        return $(selector).val();
    }, selector);
}

async function getHref(page, selector) {
    return await page.evaluate((selector) => {
        return $(selector).attr('href');
    }, selector);
}