require('dotenv').config();
const { fetchAndProcessEmails } = require('./services/gmailService');

console.log("Starting manual email fetch test...");
fetchAndProcessEmails().then(() => {
    console.log("Finished manual email fetch test.");
}).catch(err => {
    console.error("Error during manual fetch:", err);
});
