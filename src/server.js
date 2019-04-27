const express = require('express');
const linkedin = require('./linkedin');
const Raven = require('raven');
const {Counter, countVisitors} = require('@coya/counter');

const config = require('../config');
const logger = require('@coya/logger')(config.logging);

// configuring Raven
Raven.config(config.sentryEndpoint, {
	shouldSendCallback: () => {
		return process.env.NODE_ENV == 'production';
	}
}).install();

const app = express();

process.on('uncaughtException', (e) => {
	logger.error('UNCAUGHT EXCEPTION');
	logger.error(e);
});
process.on('unhandledRejection', (e) => {
	logger.error('UNHANDLED REJECTION');
	logger.error(e);
});

app.use(countVisitors);

app.get('/', (req, res) => {
	res.sendFile(config.rootWebFolder + 'index.html');
});

app.get('/request', saveIpAddress, async (req, res) => {
	logger.info(`Request received from IP address = ${req.ipAddress} with linkedin URL = ${req.query.linkedinUrl}`);

	await Counter.inc('linkedin-requests-global');
	await Counter.inc('linkedin-requests', {dailyCounter: true});

	if (!req.query.linkedinUrl) return res.json({error: 'A linkedin URL is required.'});

	try {
		const details = await linkedin.getCompanyOrPeopleDetails(req.query.linkedinUrl);
		//logger.debug(details);
		if (details['error']) res.json({error: details['error'], result: null});
		else res.json({error: null, result: details});
		logger.info('Response sent !');
	} catch (e) {
		logger.error(e);
		res.json({error: 'Something went wrong...'});
	}
});

if (process.env.NODE_ENV == 'test') module.exports = {app, linkedin};
else {
	(async () => {
		try {
			await linkedin.init();
			await Counter.connect(config.dbUrl);
		} catch (e) {
			logger.error(e);
			process.exit(1);
		}

		app.use('/assets', express.static(config.webAssetsFolder));

		logger.info('Server started on port ' + config.serverPort + ', waiting for requests...');
		app.listen(config.serverPort);
	})();
}

const ipAddresses = {};
function saveIpAddress(req, res, next) {
	const ipAddress = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).replace('::ffff:', '');
	ipAddresses[ipAddress] = (ipAddresses[ipAddress] || 0) + 1;
	logger.info('Number of shots for this address : ' + ipAddresses[ipAddress]);
	if (req.query.token != config.adminToken && ipAddresses[ipAddress] > 10)
		res.json({error: 'You have reached your maximum number of trials, contact me if you wish to work with me.'});
	else {
		if (req.query.token == config.adminToken) logger.info('Valid token admin provided.');
		req.ipAddress = ipAddress;
		next();
	}
}
