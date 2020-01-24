const pup = require('@coya/puppy');

const config = require('../config');

(async () => {
	const browser = await pup.runBrowser({headless: false});
	const page = await pup.createPage(browser, config.cookiesFile);
	await page.goto('https://www.linkedin.com');
	await page.waitFor(30000);
	await pup.saveCookies(page, config.cookiesFile);
	await browser.close();
})();
