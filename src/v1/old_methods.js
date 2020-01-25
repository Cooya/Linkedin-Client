const csv = require('csv');
const fs = require('fs');
const request = require('request');
const util = require('util');

const config = require('../../config');
const logger = require('@coya/logger')();

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const get = util.promisify(request.get);
const parseCSV = util.promisify(csv.parse);
const stringifyCSV = util.promisify(csv.stringify);

async function processEntries(page, entries, csvFile, interval) {
	let companyLink;
	let companyDetails;
	let entry;
	let currentPageUrl;
	for (let i in entries) {
		entry = entries[i];
		logger.info('Processing entry ' + i + '...');

		if (i == 0 || entry.length > 5) {
			logger.info('Skipping...');
			continue; // skip the already processed entries
		}

		await pup.goTo(page, entry[3]);
		await page.waitFor(2000);
		currentPageUrl = page.url();
		if (currentPageUrl.indexOf('https://www.linkedin.com/in/unavailable/') != -1) {
			entries[i] = entry.concat(['N/A', 'N/A', 'N/A', 'N/A', 'N/A']);
			continue;
		}

		await pup.scrollPage(page, '#experience-section', 0.5);

		// wait a bit to prevent robot detection
		logger.info(util.format('Waiting for %d ms.', interval / 2));
		await page.waitFor(interval / 2); // 2 sec minimum required otherwise it does not work very well

		// get the link of the company
		companyLink = await page.$('#experience-section > ul > li:nth-child(1) a.ember-view');
		if (!companyLink) throw Error('Cannot find the company link.');

		// going to the company page
		await pup.click(page, companyLink);

		// getting details about the company
		currentPageUrl = page.url();
		if (currentPageUrl.indexOf('https://www.linkedin.com/search/results/index/') != -1)
			entries[i] = entry.concat(['N/A', 'N/A', 'N/A', 'N/A', 'N/A']);
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
		logger.info('Saving last processed entry...');
		await writeFile(csvFile, await stringifyCSV(entries));

		// wait a bit to prevent robot detection
		logger.info(util.format('Waiting for %d ms.', interval / 2));
		await page.waitFor(interval / 2);
	}
}

async function retrieveEmail(firstName, lastName, domainName) {
	firstName = firstName
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ /g, '');
	lastName = lastName
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ /g, '');
	domainName = url.parse(domainName).hostname.replace('www.', '');

	const requestOptions = {
		url:
			'https://api.skrapp.io/api/v2/find?firstName=' +
			firstName +
			'&lastName=' +
			lastName +
			'&domain=' +
			domainName,
		headers: {
			'X-Access-Key': config.skrappApiKey,
			'Content-Type': 'application/json'
		}
	};

	try {
		const response = await get(requestOptions);
		response.body = JSON.parse(response.body);
		if (response.body['email']) return response.body;
		else return null;
	} catch (e) {
		throw e;
	}
}

async function getCompaniesData() {
	// load entries from csv file
	const entries = await parseCSV(await readFile(config.csvFile), {relax_column_count: true});
	logger.info(entries.length + ' entries to process.');

	// process entries
	const browser = await pup.runBrowser({headless: config.headless, logger});
	const page = await pup.createPage(browser, config.cookiesFile);
	await processEntries(page, entries, config.csvFile, config.scrapingInterval);
	await browser.close();

	logger.info('Process done.');
}

async function getEmails() {
	// load entries from csv file
	const entries = await parseCSV(await readFile(config.csvFile), {relax_column_count: true});
	logger.info(entries.length + ' entries to process.');

	let entry;
	let emailResult;
	for (let i in entries) {
		if (i == 0) continue;

		entry = entries[i];
		if (entry.length == 12) {
			logger.info('Skipping already processed entry ' + i + '...');
			continue;
		}

		if (entry[9] == 'N/A') {
			// cannot get the email address
			logger.info('Cannot get email address for the entry ' + i + '.');
			entries[i] = entry.concat(['N/A', 'N/A']);
			logger.info('Saving entries into file...');
			await writeFile(config.csvFile, await stringifyCSV(entries));
			continue;
		}

		logger.info('Processing entry ' + i + '...');
		emailResult = await retrieveEmail(entry[0], entry[1], entry[9]);
		entries[i] = emailResult
			? entry.concat(emailResult['email'], emailResult['accuracy'])
			: entry.concat(['N/A', 'N/A']);

		logger.info('Saving entries into file...');
		await writeFile(config.csvFile, await stringifyCSV(entries));

		sleep.sleep(1);
	}

	logger.info('Process done.');
}
