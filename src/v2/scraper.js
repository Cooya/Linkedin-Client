const nodeLinkedin = require('node-linkedin');
require('@coya/utils');

const oauth = require('./oauth');
const config = require('../../config');
const linkedinApiFields = require('../assets/linkedin_api_fields.json');
const logger = require('@coya/logger')();
const pup = require('@coya/puppy');

let linkedin;
let tokenExpirationDate;

module.exports = {
	init,
	getCompanyOrPeopleDetails
};

async function init() {
	try {
		logger.info('Initializing the Linkedin client...');
		const accessToken = await oauth.getAccessToken();
		tokenExpirationDate = new Date().addSeconds(accessToken['expires_in']);
		linkedin = nodeLinkedin(config.linkedinApiKey, config.linkedinApiSecret).init(accessToken['access_token']);
	} catch (e) {
		logger.error(e);
		throw new Error('Initialization has failed.');
	}
}

// options = page, forcePeopleScraping, skipCompanyScraping
async function getCompanyOrPeopleDetails(linkedinUrl, options = {}) {
	if (new Date() > tokenExpirationDate) await init();

	logger.info('Getting data from "' + linkedinUrl + '"...');
	let browser = null;
	let page = options.page;
	let peopleDetails = null;
	let linkedinApiInternalError = false;

	// if the provided URL is a people profile URL
	if (!isCompanyOrSchoolPage(linkedinUrl)) {
		if (options.forcePeopleScraping) {
			// force people profile scraping instead of using the API
			if (!page) {
				browser = await pup.runBrowser({ headless: config.headless, logger });
				page = await pup.createPage(browser, config.cookiesFile);
			}
			peopleDetails = await scrapPeopleProfile(page, linkedinUrl);
		} else {
			// get people data through API
			peopleDetails = await getPeopleData(linkedinUrl);
			if (peopleDetails['message']) {
				linkedinApiInternalError = peopleDetails['message'] == 'Internal API server error';
				if (!linkedinApiInternalError) throw new Error(peopleDetails['message']); // the linkedin URL is invalid
			}

			// get people data through web scraper if the people profile is private
			peopleDetails['isPrivateProfile'] = peopleDetails['id'] == 'private';
			if (peopleDetails['isPrivateProfile'] || linkedinApiInternalError) {
				if (!page) {
					browser = await pup.runBrowser({ headless: config.headless, logger });
					page = await pup.createPage(browser, config.cookiesFile);
				}
				peopleDetails = await scrapPeopleProfile(page, linkedinUrl);
			}
		}

		// return if option for skipping company scraping is set
		if (options.skipCompanyScraping) {
			if (!options.page && browser) await browser.close();
			return peopleDetails;
		}

		// try to get the company page url for the next step
		const companyId =
			peopleDetails['positions']['values'] && peopleDetails['positions']['values'][0]['company']['id'];
		if (companyId) linkedinUrl = 'https://www.linkedin.com/company/' + companyId;
		else linkedinUrl = peopleDetails['currentCompany'] && peopleDetails['currentCompany']['linkedinUrl'];

		// return if company page url has not been found or if the URL is not a company page URL
		if (!linkedinUrl || !isCompanyOrSchoolPage(linkedinUrl)) {
			if (!options.page && browser) await browser.close();
			return peopleDetails;
		}
	}

	if (!page) {
		browser = await pup.runBrowser({ headless: config.headless, logger });
		page = await pup.createPage(browser, config.cookiesFile);
	}

	// scrap company data
	let companyDetails;
	try {
		companyDetails = await scrapCompanyPage(page, linkedinUrl);
	} catch (e) {
		// I was trying to understand why I cannot log in to Linkedin from my VPS server
		logger.error(page.url());
		await page.screenshot({ path: 'error.png' });
		throw e;
	}

	if (!options.page) await browser.close();

	if (peopleDetails) {
		peopleDetails['company'] = companyDetails;
		return peopleDetails;
	}
	return companyDetails;
}

async function getPeopleData(profileUrl) {
	return new Promise((resolve, reject) => {
		linkedin.people.url(profileUrl, linkedinApiFields, (err, user) => {
			if (err) reject(err);
			else resolve(user);
		});
	});
}

async function scrapPeopleProfile(page, url = null) {
	if (url) {
		await pup.goTo(page, url, { ignoreDestination: true });
		await logIn(page, config.linkedinEmail, config.linkedinPassword, { redirectionUrl: url });
	}
	await page.waitForSelector('div.profile-detail > div.pv-deferred-area ');
	const toggleButton = await page.$('pv-top-card-section__summary-toggle-button');
	if (toggleButton) await toggleButton.click();
	if (await page.$('span.pv-top-card-v2-section__company-name'))
		await pup.scrollPage(page, '#experience-section', 0.5);
	const peopleDetails = await page.evaluate(() => {
		const name = $('h1.pv-top-card-section__name')
			.text()
			.trim()
			.split(' ');
		const experiences = $('#experience-section li')
			.get()
			.map((elt) => {
				elt = $(elt);
				return {
					companyName: elt
						.find('span.pv-entity__secondary-title')
						.text()
						.trim(),
					linkedinUrl: 'https://www.linkedin.com' + elt.find('a.ember-view').attr('href')
				};
			});
		const relatedPeople = $('section.pv-browsemap-section li')
			.get()
			.map((elt) => {
				elt = $(elt);
				return {
					name: elt
						.find('span.actor-name')
						.text()
						.trim(),
					position: elt
						.find('p.browsemap-headline')
						.text()
						.trim(),
					linkedinUrl: 'https://www.linkedin.com' + elt.find('a.pv-browsemap-section__member').attr('href')
				};
			});
		return {
			firstName: name[0],
			lastName: name[1],
			headline: $('h2.pv-top-card-section__headline')
				.text()
				.trim(),
			location: $('h3.pv-top-card-section__location')
				.text()
				.trim(),
			summary: $('p.pv-top-card-section__summary-text')
				.text()
				.trim(),
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
	if (url) {
		await pup.goTo(page, url, { ignoreDestination: true });
		await logIn(page, config.linkedinEmail, config.linkedinPassword, { redirectionUrl: url });
	}
	await page.waitForSelector('a[data-control-name="page_member_main_nav_about_tab"]');

	// if "About" section is not displayed
	if (!(await page.$('a[data-control-name="page_member_main_nav_about_tab"].active'))) {
		await page.click('a[data-control-name="page_member_main_nav_about_tab"]'); // we toggle it
		await page.waitForSelector('.org-page-details__definition-text');
	}

	const companyDetails = await page.evaluate(() => {
		const companyDetails = {};
		const keys = $('dl > dt').get();
		const values = $('dl > dd').get();
		let value, key;
		for (let i = 0; i < keys.length; ++i) {
			key = keys[i].textContent.trim();
			value = values[i].textContent.trim();
			if (key == 'Website') companyDetails['website'] = value;
			else if (key == 'Industry') companyDetails['industry'] = value;
			else if (key == 'Company size') companyDetails['companySize'] = value;
			else if (key == 'Headquarters') companyDetails['headquarters'] = value;
			else if (key == 'Type') companyDetails['companyType'] = value;
			else if (key == 'Founded') companyDetails['foundedYear'] = parseInt(value);
			else if (key == 'Specialties') companyDetails['specialties'] = value;
		}
		companyDetails['name'] = $('h1.org-top-card-summary__title').text().trim();
		companyDetails['description'] = $('div.org-grid__core-rail--no-margin-left > section > p').text().trim() || null;
		companyDetails['followers'] = parseInt($('div.org-top-card-summary__follower-count').text().replace('followers', '').replace(',', '').trim());
		companyDetails['membersOnLinkedin'] = parseInt($('a[data-control-name="topcard_see_all_employees"] > span').text().match(/See all ([0-9,]+) employees on LinkedIn/)[1].replace(',', '').trim());
		return companyDetails;
	});
	companyDetails['linkedinUrl'] = page.url().replace('/about/', '');
	return companyDetails;
}

function isCompanyOrSchoolPage(linkedinUrl) {
	return (
		linkedinUrl.indexOf('https://www.linkedin.com/company/') != -1 ||
		linkedinUrl.indexOf('https://www.linkedin.com/school/') != -1
	);
}

// method not working...
async function getCompanyData(companyId) {
	return new Promise((resolve, reject) => {
		linkedin.companies.company(companyId, (err, company) => {
			if (err) reject(err);
			else resolve(company);
		});
	});
}

async function logIn(page, login, password, options = {}) {
	let loginButton = await page.$('p.login > a, a[title="Sign in"]');
	if (loginButton) {
		// if log in button is present, we have to log in
		logger.info('Logging in...');
		await loginButton.click(); // either on the button at the top right corner either on the button in the redirection form
		try {
			// traditional login form
			await page.waitFor('#login-email', { timeout: 2000 });
		} catch (e) {
			// forced redirection to login form because we are not logged
			await page.waitForNavigation();
		}
		await page.waitFor('#login-email, #username', { timeout: 2000 });
		await page.waitFor(2000);
		await page.type('#login-email, #username', login);
		await page.type('#login-password, #password', password);
		await page.click('#login-submit, button[aria-label="Sign in"]');
		await page.waitForNavigation();
		await pup.saveCookies(page, config.cookiesFile);
		logger.info('Logged in.');
	}

	if (options.redirectionUrl && page.url() != options.redirectionUrl)
		await pup.goTo(page, options.redirectionUrl, { ignoreDestination: true });
}
