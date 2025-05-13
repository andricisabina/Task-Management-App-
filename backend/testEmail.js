require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

sendEmail({
  to: 'your@email.com', // <-- Replace with your real email address
  subject: 'Test Email',
  text: 'This is a test email from your Task Management app.'
}).then(() => {
  console.log('Test email sent!');
}).catch(err => {
  console.error('Error sending test email:', err);
}); 