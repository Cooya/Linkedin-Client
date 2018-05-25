const mongoose = require('mongoose');

const PeopleToProcess = mongoose.model('PeopleToProcess', new mongoose.Schema({
    linkedinUrl: {
        type: String,
        required: true,
        unique: true
    },
    processed: {
        type: Boolean,
        required: true
    }
}));

const companySchema = new mongoose.Schema({
    linkedinUrl: {
        type: String,
        required: true,
        sparse: true
    },
    name: {
        type: String,
        required: true
    },
    industry: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    website: {
        type: String,
        required: true
    },
    headquarters: {
        type: String,
        required: true
    },
    foundedYear: {
        type: Number,
        required: true
    },
    companyType: {
        type: String,
        required: true
    },
    companySize: {
        type: Number,
        required: true
    },
    specialties: {
        type: String,
        required: true
    },
    followers: {
        type: Number,
        required: true
    },
    membersOnLinkedin: {
        type: Number,
        required: true
    }
});
const Company = mongoose.model('Company', companySchema);

const People = mongoose.model('People', new mongoose.Schema({
    linkedinUrl: {
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    headline: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        validate: {
            validator: (v) => {
                return v != null;
            }
        },
        required: false
    },
    currentCompany: {
        type: Object,
        required: function() {
            return this.positions.length;
        }
    },
    school: {
        type: String,
        required: false
    },
    connectionsNumber: {
        type: Number,
        required: true
    },
    positions: {
        type: Array,
        required: true
    },
    relatedPeople: {
        type: Array,
        required: true
    },
    company: {
        type: companySchema,
        required: function() {
            return this.positions.length && this.positions[0]['linkedinUrl'].includes('https://www.linkedin.com/company/')
        }
    }
}));

module.exports = {
    PeopleToProcess: PeopleToProcess,
    Company: Company,
    People: People
};