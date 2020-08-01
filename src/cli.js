#!/usr/bin/env node

const config = require('../config');
const LinkedinClient = require('./LinkedinClient');

(async () => {
	if(process.argv.length < 3 || !process.argv[2]) {
		console.log('Usage : node src/cli.js LINKEDIN_URL');
		return;
	}
	
	try {
		const linkedinClient = new LinkedinClient(config.cookie);
		const result = await linkedinClient.fetch(process.argv[2]);
		console.log(result);
	} catch(e) {
		console.error(e);
	}
})();
