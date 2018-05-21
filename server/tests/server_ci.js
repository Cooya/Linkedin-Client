const app = require('../server');
const chai = require('chai');
const request = require('supertest');

const expect = chai.expect;

describe('Linkedin scraper form tests', () => {
    it('Invalid URL', (done) => {
        const url = 'toto';
        request(app).get('/request?linkedinUrl=' + url).end((err, res) => {
            expect(res.statusCode).to.equal(200);
            expect(res.body.error).to.have.string('Public profile URL is not correct');
            done();
        });
    });

    it('Invalid linkedin URL', (done) => {
        const url = 'https://www.linkedin.com/in/toto';
        request(app).get('/request?linkedinUrl=' + url).end((err, res) => {
            expect(res.statusCode).to.equal(200);
            expect(res.body.error).to.have.string('Couldn\'t find member');
            done();
        });
    });

    it('People profile without company', (done) => {
        const url = 'https://www.linkedin.com/in/joana-ferraz-3388568b/';
        request(app).get('/request?linkedinUrl=' + url).end((err, res) => {
            expect(res.statusCode).to.equal(200);
            expect(res.body.error).to.equal(null);
            expect(res.body.result['firstName']).to.equal('Joana');
            done();
        });
    });

    it('People profile with company', (done) => {
        const url = 'https://www.linkedin.com/in/nicomarcy/';
        request(app).get('/request?linkedinUrl=' + url).end((err, res) => {
            expect(res.statusCode).to.equal(200);
            expect(res.body.error).to.equal(null);
            expect(res.body.result['firstName']).to.equal('Nicolas');
            expect(res.body.result['company']['name']).to.equal('Yaal');
            done();
        });
    });

    it('Private people profile', (done) => {
        const url = 'https://www.linkedin.com/in/benoitgantaume/';
        request(app).get('/request?linkedinUrl=' + url).end((err, res) => {
            expect(res.statusCode).to.equal(200);
            expect(res.body.error).to.equal(null);
            expect(res.body.result['firstName']).to.equal('Benoit');
            expect(res.body.result['positions'][0]['companyName']).to.equal('artisandeveloppeur.fr');

            done();
        });
    });

    it('Company page', (done) => {
        const url = 'https://www.linkedin.com/company/yaal/';
        request(app).get('/request?linkedinUrl=' + url).end((err, res) => {
            expect(res.statusCode).to.equal(200);
            expect(res.body.error).to.equal(null);
            expect(res.body.result['name']).to.equal('Yaal');
            expect(res.body.result['headquarters']).to.equal('Bordeaux');
            done();
        });
    });
});