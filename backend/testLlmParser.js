require('dotenv').config();
const { parseEmail } = require('./services/emailParser');

async function test() {
    const fakeEmail = {
        from: 'recruiting@google.com',
        subject: 'Update on your application for Software Engineer',
        text: 'Hi Akshat, Thank you for applying to Google. We would love to invite you to the next round of interviews for the Software Engineer role.'
    };

    console.log("Testing emailParser...");
    const result = await parseEmail(fakeEmail);
    console.log("Result:", result);
}

test().catch(console.error);
