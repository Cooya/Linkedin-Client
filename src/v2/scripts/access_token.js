const fs = require('fs');
const request = require('request-promise');
const util = require('util');

const config = require('../../../config');
const logger = require('@coya/logger')();
const pup = require('@coya/puppy');

const writeFile = util.promisify(fs.writeFile);

(async () => {
	const browser = await pup.runBrowser({ headless: false, logger });
	const page = await pup.createPage(browser, config.cookiesFile);

	try {
		const creds = {
			client_id: config.linkedinApiKey,
			secret: config.linkedinApiSecret,
			redirect_uri: 'https://www.google.com',
			email: config.linkedinEmail,
			password: config.linkedinPassword
		};
		await getToken(page, creds);
	} catch (e) {
		logger.error(e);
	}

	//await page.waitFor(60000); // for debugging
	await browser.close();
})();

async function getToken(page, creds) {
	const authorizationPageUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
		creds.client_id
	}&redirect_uri=${creds.redirect_uri}&state=hey`;

	// go to the authorization page
	await page.goto(authorizationPageUrl);
	if (await page.$('#session_key-login')) {
		// need to log in
		await page.type('#session_key-login', creds.email);
		await page.type('#session_password-login', creds.password);
		await page.click('#btn-primary');
		await page.waitForNavigation();
		await pup.saveCookies(page, config.cookiesFile);
	}

	// allow the app if necessary
	let url = await page.url();
	if (!url.startsWith(creds.redirect_uri)) {
		const allowButton = await page.$('#oauth__auth-form__submit-btn');
		if (!allowButton) throw Error('The authorization button is not present on the page.');
		await page.click('#oauth__auth-form__submit-btn');
		await page.waitForNavigation({ timeout: 60000 });

		// check the redirection
		url = await page.url();
		if (!url.startsWith(creds.redirect_uri)) throw Error('Something went wrong during the redirection process.');
	}

	// get the code
	const code = url.match(/\?code=([^&]+)/)[1];
	if (!code) throw Error('No code has been found into the GET parameters.');

	// request the access token
	const response = await request.post('https://www.linkedin.com/oauth/v2/accessToken', {
		form: {
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: creds.redirect_uri,
			client_id: creds.client_id,
			client_secret: creds.secret
		}
	});
	const accessToken = JSON.parse(response).access_token;
	if (!accessToken) throw Error('The request has failed, no access token has been found in the response.');

	await writeFile(config.accessTokenFile, accessToken);
	logger.info('The access token has been saved successfully.');
}
