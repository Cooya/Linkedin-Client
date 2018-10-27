const fs = require('fs');
const puppeteer = require('puppeteer');
const sleep = require('sleep');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const browserOptions = {
	args: [
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--disable-notifications',
		'--window-size=1600,900',
		'--lang=en_US'
	],
	headless: true
};

module.exports = {
	runBrowser: runBrowser,
	createPage: createPage,
	goTo: goTo,
	scrollPage: scrollPage,
	infiniteScroll: infiniteScroll,
	click: click,
	reloadPage: reloadPage,
	loadCookies: loadCookies,
	saveCookies: saveCookies,
	deleteCookiesFile: deleteCookiesFile,
	value: value,
	attribute: attribute
};

async function runBrowser(options) {
	return await puppeteer.launch(Object.assign(browserOptions, options));
}

async function createPage(browser, cookiesFile) {
	console.debug('Creating page...');
	const page = await browser.newPage();
	await page.setUserAgent('Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0');
	await page.setViewport({ width: 1600, height: 900 });
	await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8' });
	if (cookiesFile) await loadCookies(page, cookiesFile);
	process.on('unhandledRejection', error => {
		page.screenshot({ path: 'error.png' }).then(() => {
			console.error(error);
			process.exit(1);
		});
	});
	console.debug('Page created.');
	return page;
}

async function goTo(page, url, timeout) {
	console.log('Going to %s...', url);

	const options = {
		waitUntil: 'networkidle2'
	};
	if (timeout)
		options['timeout'] = timeout;

	let again = true;
	while (again) {
		try {
			await page.goto(url, options);
			again = false;
		}
		catch (e) {
			if (e.message.indexOf('Navigation Timeout Exceeded') != -1)
				console.log('goTo() timeout !');
			else
				throw e;
		}
	}

	if (page.url() != url)
		throw Error('The current page is not the destination page.');
}

async function scrollPage(page, selector, xPosition = 1) {
	console.log('Scrolling the page...');
	while (true) {
		await page.evaluate('window.scrollTo(0, document.body.scrollHeight * ' + xPosition + ')');
		try {
			await page.waitForSelector(selector, { timeout: 1000 });
			return;
		}
		catch (e) {
			xPosition = xPosition >= 1 ? 0 : xPosition + 0.1;
			console.log('Scrolling again to ' + xPosition + '...');
		}
	}
}

async function infiniteScroll(page) {
	let oldScrollPos = 0;
	let newScrollPos = 0;
	while (true) {
		newScrollPos = await page.evaluate(() => {
			window.scrollBy(0, document.body.scrollHeight);
			return document.body.scrollHeight;
		});
		await sleep.sleep(1);
		if (oldScrollPos == newScrollPos)
			break;
		oldScrollPos = newScrollPos;
	}
}

async function click(page, element, timeout = 30) {
	console.log('Clicking on element...');

	let again = true;
	while (again) {
		try {
			await page.evaluate((el) => {
				el.click();
			}, element);
			await page.waitForNavigation({ timeout: timeout });
			again = false;
		}
		catch (e) {
			if (e.message.indexOf('Navigation Timeout Exceeded') != -1) {
				console.error('click() timeout !');
				await reloadPage(page);
			}
			else
				throw e;
		}
	}
}

async function reloadPage(page, timeout = 30, attempts = 5) {
	console.log('Reloading page...');

	for (let i = 0; i < attempts; ++i) {
		try {
			await page.reload({ timeout: timeout });

			// old version
			//await page.evaluate('location.reload()');
			//await page.waitForNavigation({timeout: timeout});

			return;
		}
		catch (e) {
			if (e.message.indexOf('Navigation Timeout Exceeded') != -1)
				console.error('Page reloading timeout !');
			else
				throw e;
		}
	}

	throw Error('The internet connection seems lost because the page cannot be reloaded.');
}

async function loadCookies(page, cookiesFile) {
	console.log('Loading cookies...');
	let cookies;
	try {
		cookies = JSON.parse(await readFile(cookiesFile, 'utf-8'));
	}
	catch (e) {
		await writeFile(cookiesFile, '[]');
		console.log('Empty cookies file created.');
		return;
	}
	await page.setCookie(...cookies);
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
	if (!fileExists)
		return console.log('Cookies file does not exist.');
	await fs.unlink(cookiesFile);
	console.log('Cookies file deleted.');
}

function value(page, selector, value) {
	return page.evaluate((selector, value) => {
		var elt = document.querySelector(selector);
		if (value !== undefined)
			elt.value = value;
		return elt.value;
	}, selector, value);
}

async function attribute(page, selector, attribute, value) {
	return await page.evaluate((selector, attribute, value) => {
		var elt = document.querySelector(selector);
		if (value !== undefined)
			elt[attribute] = value;
		return elt[attribute];
	}, selector, attribute, value);
}