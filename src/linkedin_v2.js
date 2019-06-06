const cheerio = require('cheerio');
const fs = require('fs');
const request = require('request-promise');
const unescape = require('unescape');

const config = require('../config');
const debugFile = './assets/debug.json';
const jar = buildCookiesJar(config.cookiesFile);

const isDevMode = process.env.NODE_ENV == 'dev' || process.env.NODE_ENV == 'development';
if (isDevMode) fs.writeFileSync(debugFile, '');

function buildCookiesJar(cookiesFile) {
	const cookies = require(cookiesFile);
	const jar = request.jar();
	for (let cookie of cookies) {
		jar.setCookie(request.cookie(cookie.name + '=' + cookie.value), 'https://www.linkedin.com');
	}
	return jar;
}

function processPeopleProfile(item, result) {
	if (item.$type == 'com.linkedin.voyager.identity.profile.Profile') {
		result.firstName = item.firstName;
		result.lastName = item.lastName;
		result.headline = item.headline;
		result.location = item.locationName;
		result.address = item.address;
		result.industry = item.industryName;
		result.summary = item.summary;
		if (result.birthDate) {
			result.birthDate = item.birthDate;
			delete result.birthDate.$type;
		}
	} else if (item.$type == 'com.linkedin.voyager.common.FollowingInfo' && item.followerCount)
		result.connections = item.followerCount;
	else if (item.$type == 'com.linkedin.voyager.identity.profile.Skill') {
		if (result.skills === undefined) result.skills = [];
		result.skills.push(item.name);
	} else if (item.$type == 'com.linkedin.voyager.identity.profile.Position') {
		if (result.positions === undefined) result.positions = [];
		const position = {
			title: item.title,
			company: item.companyName,
			location: item.location,
			timePeriod: item.timePeriod
		};
		if (position.timePeriod) {
			delete position.timePeriod.$type;
			if (position.timePeriod.startDate) delete position.timePeriod.startDate.$type;
			if (position.timePeriod.endDate) delete position.timePeriod.endDate.$type;
		}
		result.positions.push(position);
	} else if (item.$type == 'com.linkedin.voyager.identity.profile.Education') {
		if (result.education === undefined) result.education = [];
		const degree = {
			degree: item.degreeName,
			school: item.schoolName,
			field: item.fieldOfStudy,
			timePeriod: item.timePeriod
		};
		if (degree.timePeriod) {
			delete degree.timePeriod.$type;
			if (degree.timePeriod.startDate) delete degree.timePeriod.startDate.$type;
			if (degree.timePeriod.endDate) delete degree.timePeriod.endDate.$type;
		}
		result.education.push(degree);
	} else if (item.$type == 'com.linkedin.voyager.identity.profile.Language') {
		if (result.languages === undefined) result.languages = [];
		result.languages.push({
			language: item.name,
			proficiency: item.proficiency
		});
	}
}

function processCompanyPage(item, result) {
	if (item.$type == 'com.linkedin.voyager.common.Industry' && item.localizedName)
		result.industry = item.localizedName;
	else if (item.$type == 'com.linkedin.voyager.organization.Company' && item.foundedOn) {
		result.name = item.name;
		result.tagline = item.tagline;
		result.description = item.description;
		result.website = item.companyPageUrl;
		result.companySize =
			item.staffCountRange.start +
			(item.staffCountRange.end ? '-' + item.staffCountRange.end : '+') +
			' employees';
		result.membersOnLinkedin = item.staffCount;
		result.headquarters = item.headquarter;
		delete result.headquarters.$type;
		result.companyType = item.companyType.localizedName;
		result.foundedYear = item.foundedOn.year;
		result.specialties = item.specialities;
		result.followers = result.followingItems[item[['*followingInfo']]];
		delete result.followingItems;
	} else if (item.$type == 'com.linkedin.voyager.common.FollowingInfo') {
		if (result.followingItems === undefined) result.followingItems = {};
		result.followingItems[item.entityUrn] = item.followerCount;
	}
}

async function getCompanyOrPeopleDetails(url) {
	let processMethod;
	if (url.match(/^https:\/\/www.linkedin.com\/in\//)) processMethod = processPeopleProfile;
	else if (url.match(/^https:\/\/www.linkedin.com\/company\//)) {
		url += url[url.length - 1] == '/' ? 'about/' : '/about/';
		processMethod = processCompanyPage;
	} else throw new Error(`Invalid URL provided ("${url}"), it must be a people profile URL or a company page URL.`);

	const html = await request({url, jar});
	const $ = cheerio.load(html);
	let data,
		result = {linkedinUrl: url.replace('/about/', '')};
	while (!result.name && !result.firstName) {
		// this loop allows to fix a bug with random missing <code> tags
		for (let elt of $('code').get()) {
			try {
				data = JSON.parse(unescape($(elt).html()));
			} catch (e) {
				continue;
			}
			if (!data.included) continue;
			for (let item of data.included) {
				processMethod(item, result);
				if (isDevMode) fs.appendFileSync(debugFile, JSON.stringify(item, null, 4) + '\n');
			}
		}
		if (!result.industry) return null; // this company or people does not exist
	}

	return result;
}

module.exports = {
	getCompanyOrPeopleDetails
};
