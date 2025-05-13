const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM
} = process.env;

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? parseInt(SMTP_PORT) : 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

module.exports = async function sendEmail({ to, subject, text, html }) {
  if (!transporter) {
    // Fallback: log to console
    console.log('--- Email (SMTP not configured) ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    if (html) console.log('HTML:', html);
    console.log('-----------------------------------');
    return Promise.resolve();
  }
  const mailOptions = {
    from: SMTP_FROM || SMTP_USER,
    to,
    subject,
    text,
    html
  };
  await transporter.sendMail(mailOptions);
}; 