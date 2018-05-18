const fs = require('fs');
const url = require('url');
const util = require('util');

const config = require('./assets/config.json');
const linkedinApiFields = require('./linkedin_api_fields.json');

const csv = require('csv');
const linkedin = require('node-linkedin')(config.linkedinApiKey, config.linkedinApiSecret).init(config.linkedinApiToken);
const puppeteer = require('puppeteer');
const request = require('request');
const sleep = require('sleep');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const get = util.promisify(request.get);
const parseCSV = util.promisify(csv.parse);
const stringifyCSV = util.promisify(csv.stringify);

const browserOptions = {
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ],
    headless: true
};

module.exports = {
    getCompanyOrPeopleDetails: getCompanyOrPeopleDetails
};

async function getCompanyOrPeopleDetails(linkedinUrl) {
    console.log('Getting data from "' + linkedinUrl + '"...');
    let peopleDetails = null;

    // if the provided URL is a people profile URL
    if(linkedinUrl.indexOf('https://www.linkedin.com/company/') == -1) {
        peopleDetails = await getPeopleData(linkedinUrl);
        const companyId = peopleDetails['positions'] && peopleDetails['positions']['values'] && peopleDetails['positions']['values'][0]['company']['id'];
        if(!companyId)
            return peopleDetails;
        linkedinUrl = 'https://www.linkedin.com/company/' + companyId;
    }

    // scrap company data
    const browser = await puppeteer.launch(browserOptions);
    const companyDetails = await scrapCompanyPage(await createPage(browser, config.cookiesFile), linkedinUrl);
    await browser.close();

    if(peopleDetails) {
        peopleDetails['company'] = companyDetails;
        return peopleDetails;
    }
    return companyDetails;
}

async function manualLogIn() {
    const browser = await puppeteer.launch(browserOptions);
    const page = await createPage(browser, config.cookiesFile);
    await page.waitFor(60000);
    await saveCookies(page, config.cookiesFile);
    await browser.close();
}

async function getCompaniesData() {
    // load entries from csv file
    const entries = (await parseCSV(await readFile(config.csvFile), {'relax_column_count': true}));
    console.log(entries.length + ' entries to process.');

    // process entries
    const browser = await puppeteer.launch(browserOptions);
    const page = await createPage(browser, config.cookiesFile);
    await processEntries(page, entries, config.csvFile, config.scrapingInterval);
    await browser.close();

    console.log('Process done.');
}

async function getEmails() {
    // load entries from csv file
    const entries = (await parseCSV(await readFile(config.csvFile), {'relax_column_count': true}));
    console.log(entries.length + ' entries to process.');

    let entry;
    let emailResult;
    for(let i in entries) {
        if(i == 0)
            continue;

        entry = entries[i];
        if(entry.length == 12) {
            console.log('Skipping already processed entry ' + i + '...');
            continue;
        }

        if(entry[9] == 'N/A') { // cannot get the email address
            console.log('Cannot get email address for the entry ' + i + '.');
            entries[i] = entry.concat(['N/A', 'N/A']);
            console.log('Saving entries into file...');
            await writeFile(config.csvFile, await stringifyCSV(entries));
            continue;
        }

        console.log('Processing entry ' + i + '...');
        emailResult = await retrieveEmail(entry[0], entry[1], entry[9]);
        entries[i] = emailResult ? entry.concat(emailResult['email'], emailResult['accuracy']) : entry.concat(['N/A', 'N/A']);

        console.log('Saving entries into file...');
        await writeFile(config.csvFile, await stringifyCSV(entries));

        sleep.sleep(1);
    }

    console.log('Process done.');
}

async function processEntries(page, entries, csvFile, interval) {
    let companyLink;
    let companyDetails;
    let entry;
    let currentPageUrl;
    for(let i in entries) {
        entry = entries[i];
        console.log('Processing entry ' + i + '...');

        if(i == 0 || entry.length > 5) {
            console.log('Skipping...');
            continue; // skip the already processed entries
        }

        await goTo(page, entry[3], 30000);
        await page.waitFor(2000);
        currentPageUrl = page.url();
        if(currentPageUrl.indexOf('https://www.linkedin.com/in/unavailable/') != -1) {
            entries[i] = entry.concat([
                'N/A',
                'N/A',
                'N/A',
                'N/A',
                'N/A'
            ]);
            continue;
        }

        await scrollPage(page, '#experience-section', 0.5);

        // wait a bit to prevent robot detection
        console.log(util.format('Waiting for %d ms.', interval / 2));
        await page.waitFor(interval / 2);// 2 sec minimum required otherwise it does not work very well

        // get the link of the company
        companyLink = await page.$('#experience-section > ul > li:nth-child(1) a.ember-view');
        if(!companyLink)
            throw Error('Cannot find the company link.');

        // going to the company page
        await click(page, companyLink);

        // getting details about the company
        currentPageUrl = page.url();
        if(currentPageUrl.indexOf('https://www.linkedin.com/search/results/index/') != -1)
            entries[i] = entry.concat([
                'N/A',
                'N/A',
                'N/A',
                'N/A',
                'N/A'
            ]);
        else {
            companyDetails = await scrapCompanyPage(page);
            entries[i] = entry.concat([
                currentPageUrl,
                companyDetails['headquarters'] || 'N/A',
                companyDetails['companySize'] || 'N/A',
                companyDetails['membersOnLinkedin'] || 'N/A',
                companyDetails['website'] || 'N/A'
            ]);
        }

        // saving the retrieved details in the csv file
        console.log('Saving last processed entry...');
        await writeFile(csvFile, await stringifyCSV(entries));

        // wait a bit to prevent robot detection
        console.log(util.format('Waiting for %d ms.', interval / 2));
        await page.waitFor(interval / 2);
    }
}

async function retrieveEmail(firstName, lastName, domainName) {
    firstName = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ /g, '');
    lastName = lastName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ /g, '');
    domainName = url.parse(domainName).hostname.replace('www.', '');

    const requestOptions = {
        url: 'https://api.skrapp.io/api/v2/find?firstName=' + firstName + '&lastName=' + lastName + '&domain=' + domainName,
        headers: {
            'X-Access-Key': config.skrappApiKey,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await get(requestOptions);
        response.body = JSON.parse(response.body);
        if(response.body['email'])
            return response.body;
        else
            return null;
    }
    catch(e) {
        throw e;
    }
}

async function getPeopleData(profileUrl) {
    return new Promise((resolve, reject) => {
        linkedin.people.url(profileUrl, linkedinApiFields, (err, user) => {
            if(err) reject(err);
            else resolve(user);
        });
    });
}

async function getCompanyData(companyId) {
    return new Promise((resolve, reject) => {
        linkedin.companies.company(companyId, (err, company) => {
            if(err) reject(err);
            else resolve(company);
        });
    });
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
        companyDetails['industry'] = $('span.company-industries').text().trim();
        companyDetails['description'] = $('p.org-about-us-organization-description__text').text().trim();
        companyDetails['website'] = $('a.org-about-us-company-module__website').text().trim();
        companyDetails['headquarters'] = $('p.org-about-company-module__headquarters').text().trim();
        companyDetails['foundedYear'] = $('p.org-about-company-module__founded').text().trim();
        companyDetails['companyType'] = $('p.org-about-company-module__company-type').text().trim();
        companyDetails['companySize'] = $('p.org-about-company-module__company-staff-count-range').text().trim();
        companyDetails['specialties'] = $('p.org-about-company-module__specialities').text().trim();
        companyDetails['followers'] = $('span.org-top-card-module__followers-count').text().replace('followers', '').trim();
        companyDetails['membersOnLinkedin'] = $('a.snackbar-description-see-all-link').text().replace('See all', '').replace('employees on LinkedIn', '').replace(',', '').trim();
        companyDetails['linkedinUrl'] = page.url();
        return companyDetails;
    });
}

async function createPage(browser, cookiesFile) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0');
    await loadCookies(page, cookiesFile);
    return page;
}

async function goTo(page, url, timeout) {
    console.log('Going to %s...', url);

    const options = timeout ? {timeout: timeout} : {};
    let again = true;
    while(again) {
        try {
            await page.goto(url, options);
            again = false;
        }
        catch(e) {
            if(e.message.indexOf('Navigation Timeout Exceeded') != -1)
                console.log('goTo() timeout !');
            else
                throw e;
        }
    }
}

async function scrollPage(page, selector, targetPosition = 1) {
    console.log('Scrolling the page...');
    while(true) {
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight * ' + targetPosition + ')');
        try {
            await page.waitForSelector('#experience-section', {timeout: 1000});
            return;
        }
        catch(e) {
            targetPosition = targetPosition >= 1 ? 0 : targetPosition + 0.1;
            console.log('Scrolling again to ' + targetPosition + '...');
        }
    }
}

async function click(page, element, timeout) {
    console.log('Clicking on element...');

    const options = timeout ? {timeout: timeout} : {};
    let again = true;
    while(again) {
        try {
            const navigationPromise = page.waitForNavigation(options);
            await page.evaluate((el) => {
                el.click();
            }, element);
            await navigationPromise;
            again = false;
        }
        catch(e) {
            if(e.message.indexOf('Navigation Timeout Exceeded') != -1) {
                console.error('click() timeout !');
                await reloadPage(page);
            }
            else
                throw e;
        }
    }
}

async function reloadPage(page, timeout) {
    console.log('Reloading page...');

    const options = timeout ? {timeout: timeout} : {};
    const navigationPromise = page.waitForNavigation(options);
    await page.evaluate('location.reload()');
    await navigationPromise;
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