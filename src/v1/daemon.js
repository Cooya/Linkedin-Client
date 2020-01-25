const sleep = require('sleep');
const mongoose = require('mongoose');

const config = require('../../config');
const linkedin = require('../linkedin');
const logger = require('@coya/logger')();
const models = require('./models');
const pup = require('@coya/puppy');

const startingPointUrl = 'https://www.linkedin.com/in/nicomarcy/';
const People = models.People;
const PeopleToProcess = models.PeopleToProcess;

(async function main() {
	try {
		await mongoose.connect('mongodb://localhost/test');
	} catch (e) {
		logger.error(e);
		process.exit(1);
	}

	const browser = await pup.runBrowser({ logger });
	const page = await pup.createPage(browser, config.cookiesFile);

	let peopleDetails;
	let peopleToProcess = await findNextOnePeopleToProcess();
	if (!peopleToProcess) peopleToProcess = new PeopleToProcess({ linkedinUrl: startingPointUrl, processed: false });
	let timeToWait;
	while (peopleToProcess) {
		logger.info('Retrieving data from the current people to process...');
		try {
			peopleDetails = await linkedin.getCompanyOrPeopleDetails(peopleToProcess.linkedinUrl, {
				page: page,
				forcePeopleScraping: true
			});
			logger.info(peopleDetails);
		} catch (e) {
			if (e.message.indexOf('Page crashed!') != -1) continue;
			logger.error(e);
			process.exit(1);
		}

		await savePeople(peopleDetails);
		for (let relatedPeople of peopleDetails['relatedPeople'])
			await savePeopleToProcess(relatedPeople['linkedinUrl']);
		await markPeopleToProcessAsProcessed(peopleToProcess);
		peopleToProcess = await findNextOnePeopleToProcess();

		timeToWait = getRandomInt(120000, 180000);
		logger.info('Sleeping for ' + timeToWait + 'ms...');
		sleep.msleep(timeToWait);
	}

	await browser.close();
})();

async function findNextOnePeopleToProcess() {
	logger.info('Fetching the next one people to process...');
	return await PeopleToProcess.findOne({ processed: false });
}

async function savePeople(peopleDetails) {
	logger.info('Saving people in database...');
	try {
		const people = new People(peopleDetails);
		await people.validate();
		await people.save();
	} catch (e) {
		logger.error(e);
		process.exit(1);
	}
}

async function savePeopleToProcess(linkedinUrl) {
	logger.info('Saving related people in database...');
	try {
		await new PeopleToProcess({
			linkedinUrl: linkedinUrl,
			processed: false
		}).save();
	} catch (e) {
		if (e.message.indexOf('E11000 duplicate key error collection') == -1) {
			logger.error(e);
			process.exit(1);
		}
	}
}

async function markPeopleToProcessAsProcessed(peopleToProcess) {
	logger.info('Marking the last processed people as processed...');
	try {
		peopleToProcess.processed = true;
		await peopleToProcess.save();
	} catch (e) {
		logger.error(e);
		process.exit(1);
	}
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; // the maximum is exclusive and the minimum is inclusive
}
