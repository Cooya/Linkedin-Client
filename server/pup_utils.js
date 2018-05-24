const fs = require('fs');
const puppeteer = require('puppeteer');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const browserOptions = {
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=1600,900`
    ],
    headless: true
};

module.exports = {
    runBrowser: runBrowser,
    createPage: createPage,
    goTo: goTo,
    scrollPage: scrollPage,
    click: click,
    reloadPage: reloadPage,
    loadCookies: loadCookies,
    saveCookies: saveCookies,
    deleteCookiesFile: deleteCookiesFile,
    getValue: getValue,
    getHref: getHref
};

async function runBrowser(options) {
    return await puppeteer.launch(Object.assign(browserOptions, options));
}

async function createPage(browser, cookiesFile) {
    console.debug('Creating page...');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0');
    await page.setViewport({
        width: 1600,
        height: 900
    });
    if(cookiesFile) await loadCookies(page, cookiesFile);
    console.debug('Page created.');
    return page;
}

async function goTo(page, url, timeout) {
    console.log('Going to %s...', url);

    const options = timeout ? {timeout: timeout} : {};
    let again = true;
    while(again) {
        try {
            await page.goto(url, options);
            again = false;
        }
        catch(e) {
            if(e.message.indexOf('Navigation Timeout Exceeded') != -1)
                console.log('goTo() timeout !');
            else
                throw e;
        }
    }
}

async function scrollPage(page, selector, xPosition = 1) {
    console.log('Scrolling the page...');
    while(true) {
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight * ' + xPosition + ')');
        try {
            await page.waitForSelector(selector, {timeout: 1000});
            return;
        }
        catch(e) {
            xPosition = xPosition >= 1 ? 0 : xPosition + 0.1;
            console.log('Scrolling again to ' + xPosition + '...');
        }
    }
}

async function click(page, element, timeout) {
    console.log('Clicking on element...');

    const options = timeout ? {timeout: timeout} : {};
    let again = true;
    while(again) {
        try {
            const navigationPromise = page.waitForNavigation(options);
            await page.evaluate((el) => {
                el.click();
            }, element);
            await navigationPromise;
            again = false;
        }
        catch(e) {
            if(e.message.indexOf('Navigation Timeout Exceeded') != -1) {
                console.error('click() timeout !');
                await reloadPage(page);
            }
            else
                throw e;
        }
    }
}

async function reloadPage(page, timeout) {
    console.log('Reloading page...');

    const options = timeout ? {timeout: timeout} : {};
    const navigationPromise = page.waitForNavigation(options);
    await page.evaluate('location.reload()');
    await navigationPromise;
}

async function loadCookies(page, cookiesFile) {
    console.log('Loading cookies...');
    let cookies;
    try {
        cookies = await readFile(cookiesFile);
    }
    catch(e) {
        throw new Error('Cookies file does not exist.');
    }
    await page.setCookie(...JSON.parse(cookies));
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
    if(!fileExists)
        return console.log('Cookies file does not exist.');
    await fs.unlink(cookiesFile);
    console.log('Cookies file deleted.');
}

async function getValue(page, selector) {
    return await page.evaluate((selector) => {
        return $(selector).val();
    }, selector);
}

async function getHref(page, selector) {
    return await page.evaluate((selector) => {
        return $(selector).attr('href');
    }, selector);
}