const fs = require('fs');
const os = require('os');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

async function readCSVFile(csvFile, separator = ',') {
    const content = await readFile(csvFile, 'utf-8');
    const array = content.split(os.EOL);
    array.map((entry, index) => {
        array[index] = entry.trim().split(separator);
    });
    return array;
}

async function writeIntoCSVFile(csvFile, array, separator = ',') {
    array.map((entry, index) => {
        array[index] = entry.join(separator);
    });
    await writeFile(csvFile, array.join('\n'));
}

module.exports = {
    readFile: readCSVFile,
    writeFile: writeIntoCSVFile
};