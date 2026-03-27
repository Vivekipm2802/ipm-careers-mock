const nodemailer = require('nodemailer');

/**
 * Creates and returns a configured nodemailer transporter.
 * Reads SMTP credentials from environment variables.
 *
 * Required env vars:
 *   SMTP_HOST        - e.g. smtp.zeptomail.in
 *   SMTP_PORT        - e.g. 465
 *   SMTP_USER        - e.g. emailapikey
 *   SMTP_PASS        - the API key / password
 *   EMAIL_FROM_NAME  - e.g. IPM Careers
 *   EMAIL_FROM_ADDR  - e.g. info@ipmcareer.in
 */
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Missing SMTP environment variables. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.'
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function getFromAddress() {
  const name = process.env.EMAIL_FROM_NAME || 'IPM Careers';
  const addr = process.env.EMAIL_FROM_ADDR || 'info@ipmcareer.in';
  return `"${name}" <${addr}>`;
}

module.exports = { getTransporter, getFromAddress };
