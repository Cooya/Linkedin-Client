const assert = require('assert');
const qs = require('querystring');
const request = require('request-promise');
const sleep = require('sleep');
const url = require('url');

const config = require('../config');
const pup = require('./pup_utils');

const authorizationURL = 'https://www.linkedin.com/oauth/v2/authorization';
const accessTokenURl = 'https://www.linkedin.com/oauth/v2/accessToken';

async function getAccessToken() {
	let params = qs.stringify({
		response_type: 'code',
		client_id: config.linkedinApiKey,
		redirect_uri: config.oauthCallback,
		state: '12345'
	});

	const browser = await pup.runBrowser({headless: config.headless});
	const page = await pup.createPage(browser, config.cookiesFile);
	await pup.goTo(page, authorizationURL + '?' + params, {ignoreDestination: true});

	// submit the form if there is a form
	if (await page.$('#session_key-login')) {
		if (!(await pup.value(page, '#session_key-login'))) await page.type('#session_key-login', config.linkedinEmail);
		await page.type('#session_password-login', config.linkedinPassword);
		await page.click('#btn-primary');
	} else if (await page.$('#username')) {
		if (!(await pup.value(page, '#username'))) await page.type('#username', config.linkedinEmail);
		await page.type('#password', config.linkedinPassword);
		await page.click('button[type="submit"]');
	} else throw new Error('This login page is unknown.');
	await page.waitForNavigation();

	// if (await page.$('div.recaptcha-checkbox-checkmark')) {
	// 	console.log('Google recaptcha asked.');
	// 	await page.waitForNavigation();
	// }

	// authorize the app if asked
	if (await page.$('#oauth__auth-form__submit-btn')) {
		await page.waitForNavigation();
		await page.click('#oauth__auth-form__submit-btn');
	}

	params = qs.parse(url.parse(page.url()).query);
	sleep.sleep(60);
	assert(params['code']);
	assert(params['state']);

	let res = await request.post(accessTokenURl, {
		form: {
			code: params['code'],
			redirect_uri: config.oauthCallback,
			client_id: config.linkedinApiKey,
			client_secret: config.linkedinApiSecret,
			grant_type: 'authorization_code'
		}
	});
	res = JSON.parse(res);
	assert(res['access_token']);
	assert(res['expires_in']);

	await browser.close();
	return res;
}

if (process.env.NODE_ENV == 'oauth') {
	(async () => {
		try {
			const accessToken = await getAccessToken();
			console.log(accessToken);
		} catch (e) {
			console.error(e);
		}
	})();
} else {
	module.exports = {
		getAccessToken
	};
}
