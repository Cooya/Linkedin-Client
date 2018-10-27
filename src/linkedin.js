const fs = require('fs');
const url = require('url');
const util = require('util');

const csv = require('csv');
const nodeLinkedin = require('node-linkedin');
const request = require('request');
const sleep = require('sleep');

const config = require('../config');
const linkedinApiFields = require('../assets/linkedin_api_fields.json');
const pup = require('./pup_utils');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const get = util.promisify(request.get);
const parseCSV = util.promisify(csv.parse);
const stringifyCSV = util.promisify(csv.stringify);

let linkedin;

module.exports = {
    init: init,
    getCompanyOrPeopleDetails: getCompanyOrPeopleDetails
};

async function init() {
    try {
        console.log('Initializing the Linkedin client...');
        const accessToken = await readFile(config.accessTokenFile);
        linkedin = nodeLinkedin(config.linkedinApiKey, config.linkedinApiSecret).init(accessToken.toString());
    }
    catch(e) {
        console.error(e);
        throw new Error('Initialization has failed. Maybe the access token file is absent...');
    }
}

// options = page, forcePeopleScraping, skipCompanyScraping
async function getCompanyOrPeopleDetails(linkedinUrl, options = {}) {
    console.log('Getting data from "' + linkedinUrl + '"...');
    let browser = null;
    let page = options.page;
    let peopleDetails = null;

    // if the provided URL is a people profile URL
    if(!isCompanyOrSchoolPage(linkedinUrl)) {
        if(options.forcePeopleScraping) { // force people profile scraping instead of using the API
            if(!page) {
                browser = await pup.runBrowser();
                page = await pup.createPage(browser, config.cookiesFile);
            }
            peopleDetails = await scrapPeopleProfile(page, linkedinUrl);
        }
        else {
            // get people data through API
            peopleDetails = await getPeopleData(linkedinUrl);
            if(peopleDetails['message']) // the linkedin URL is invalid
                return {error: peopleDetails['message']};

            // get people data through web scraper if the people profile is private
            peopleDetails['isPrivateProfile'] = peopleDetails['id'] == 'private';
            if(peopleDetails['isPrivateProfile']) {
                if(!page) {
                    browser = await pup.runBrowser();
                    page = await pup.createPage(browser, config.cookiesFile);
                }
                peopleDetails = await scrapPeopleProfile(page, linkedinUrl);
            }
        }

        // return if option for skipping company scraping is set
        if(options.skipCompanyScraping) {
            if(!options.page && browser) await browser.close();
            return peopleDetails;
        }

        // try to get the company page url for the next step
        const companyId = peopleDetails['positions']['values'] && peopleDetails['positions']['values'][0]['company']['id'];
        if(companyId)
            linkedinUrl = 'https://www.linkedin.com/company/' + companyId;
        else
            linkedinUrl = peopleDetails['currentCompany'] && peopleDetails['currentCompany']['linkedinUrl'];

        // return if company page url has not been found or if the URL is not a company page URL
        if(!linkedinUrl || !isCompanyOrSchoolPage(linkedinUrl)) {
            if(!options.page && browser) await browser.close();
            return peopleDetails;
        }
    }

    // scrap company data
    if(!page) {
        browser = await pup.runBrowser();
        page = await pup.createPage(browser, config.cookiesFile);
    }
    const companyDetails = await scrapCompanyPage(page, linkedinUrl);
    if(!options.page) await browser.close();

    if(peopleDetails) {
        peopleDetails['company'] = companyDetails;
        return peopleDetails;
    }
    return companyDetails;
}

async function getPeopleData(profileUrl) {
    return new Promise((resolve, reject) => {
        linkedin.people.url(profileUrl, linkedinApiFields, (err, user) => {
            if(err) reject(err);
            else resolve(user);
        });
    });
}

async function scrapPeopleProfile(page, url = null) {
    if(url)
        await page.goto(url);
    await page.waitForSelector('section.pv-profile-section');
    const toggleButton = await page.$('pv-top-card-section__summary-toggle-button');
    if(toggleButton)
        await toggleButton.click();
    if(await page.$('span.pv-top-card-v2-section__company-name'))
        await pup.scrollPage(page, '#experience-section', 0.5);
    const peopleDetails = await page.evaluate(() => {
        const name = $('h1.pv-top-card-section__name').text().trim().split(' ');
        const experiences = $('#experience-section li').get().map((elt) => {
            elt = $(elt);
            return {
                companyName: elt.find('span.pv-entity__secondary-title').text().trim(),
                linkedinUrl: 'https://www.linkedin.com' + elt.find('a.ember-view').attr('href')
            }
        });
        const relatedPeople = $('section.pv-browsemap-section li').get().map((elt) => {
           elt = $(elt);
           return {
               name: elt.find('span.actor-name').text().trim(),
               position: elt.find('p.browsemap-headline').text().trim(),
               linkedinUrl: 'https://www.linkedin.com' + elt.find('a.pv-browsemap-section__member').attr('href')
           }
        });
        return {
            firstName: name[0],
            lastName: name[1],
            headline: $('h2.pv-top-card-section__headline').text().trim(),
            location: $('h3.pv-top-card-section__location').text().trim(),
            summary: $('p.pv-top-card-section__summary-text').text().trim(),
            currentCompany: experiences.length ? experiences[0] : null,
            school: $('a.pv-top-card-v2-section__link-education span').text().trim() || null,
            connectionsNumber: parseInt($('span.pv-top-card-v2-section__connections').text().match(/[0-9]+/)[0]),
            positions: experiences,
            relatedPeople: relatedPeople
        };
    });
    peopleDetails['linkedinUrl'] = page.url();
    return peopleDetails;
}

async function scrapCompanyPage(page, url = null) {
    if(url)
        await page.goto(url);
    await page.waitFor('#org-about-company-module__show-details-btn');
    await page.click('#org-about-company-module__show-details-btn');
    await page.waitForSelector('div.org-about-company-module__about-us-extra');
    const companyDetails = await page.evaluate(() => {
        const companyDetails = {};
        companyDetails['name'] = $('h1.org-top-card-module__name').text().trim();
        companyDetails['industry'] = $('span.company-industries').text().trim();
        companyDetails['description'] = $('p.org-about-us-organization-description__text').text().trim() || null;
        companyDetails['website'] = $('a.org-about-us-company-module__website').text().trim();
        companyDetails['headquarters'] = $('p.org-about-company-module__headquarters').text().trim() || null;
        companyDetails['foundedYear'] = parseInt($('p.org-about-company-module__founded').text().trim());
        companyDetails['companyType'] = $('p.org-about-company-module__company-type').text().trim() || null;
        companyDetails['companySize'] = parseInt($('p.org-about-company-module__company-staff-count-range').text().trim());
        companyDetails['specialties'] = $('p.org-about-company-module__specialities').text().trim() || null;
        companyDetails['followers'] = parseInt($('span.org-top-card-module__followers-count').text().replace('followers', '').replace(',', '').trim());
        companyDetails['membersOnLinkedin'] = parseInt($('a.snackbar-description-see-all-link').text().replace('See all', '').replace('employees on LinkedIn', '').replace(',', '').trim());
        return companyDetails;
    });
    companyDetails['linkedinUrl'] = page.url();
    return companyDetails;
}

function isCompanyOrSchoolPage(linkedinUrl) {
    return linkedinUrl.indexOf('https://www.linkedin.com/company/') != -1 || linkedinUrl.indexOf('https://www.linkedin.com/school/') != -1;
}



// NOT USED ANYMORE
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

        await pup.goTo(page, entry[3], 30000);
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

        await pup.scrollPage(page, '#experience-section', 0.5);

        // wait a bit to prevent robot detection
        console.log(util.format('Waiting for %d ms.', interval / 2));
        await page.waitFor(interval / 2);// 2 sec minimum required otherwise it does not work very well

        // get the link of the company
        companyLink = await page.$('#experience-section > ul > li:nth-child(1) a.ember-view');
        if(!companyLink)
            throw Error('Cannot find the company link.');

        // going to the company page
        await pup.click(page, companyLink);

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

async function getCompaniesData() {
    // load entries from csv file
    const entries = (await parseCSV(await readFile(config.csvFile), {'relax_column_count': true}));
    console.log(entries.length + ' entries to process.');

    // process entries
    const browser = await pup.runBrowser();
    const page = await pup.createPage(browser, config.cookiesFile);
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



// NOT WORKING
async function getCompanyData(companyId) {
    return new Promise((resolve, reject) => {
        linkedin.companies.company(companyId, (err, company) => {
            if(err) reject(err);
            else resolve(company);
        });
    });
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