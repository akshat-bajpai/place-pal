const cron = require('node-cron');
const { fetchAndProcessEmails } = require('./gmailService');

const initCronJobs = () => {
    // Run immediately on server start to catch any emails since last shutdown
    console.log('[Cron] Running startup email sync...');
    fetchAndProcessEmails();

    // Then sync every 5 minutes
    cron.schedule('*/5 * * * *', () => {
        console.log('[Cron] Running 5-minute email sync...');
        fetchAndProcessEmails();
    });

    console.log('[Cron] Email sync scheduled every 5 minutes.');
};

module.exports = { initCronJobs };
