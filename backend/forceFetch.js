require('dotenv').config();
const { fetchAndProcessEmails } = require('./services/gmailService');

console.log("Forcing manual fetch...");
fetchAndProcessEmails().then(() => console.log("Done")).catch(console.error);
