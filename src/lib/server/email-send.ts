
// FREE WIP alternative 
 import nodemailer from 'nodemailer';
 import {GMAIL_USR, GMAIL_PWD} from '$env/static/private';
// Replace these with your actual Gmail credentials
const GMAIL_USER = GMAIL_USR;
const GMAIL_PASS = GMAIL_PWD;

export default async function sendEmail(
  email: string,
  subject: string,
  bodyHtml?: string,
  bodyText?: string
) {
  // Create a transporter using Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  try {
    // Prepare email options
    const mailOptions = {
      from: GMAIL_USER,
      to: email,
      subject: subject,
      html: bodyHtml,
      text: bodyText,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log('E-mail sent successfully!');
    return {
      statusCode: 200,
      message: 'E-mail sent successfully.',
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Error sending email: ${JSON.stringify(error)}`);
  }
}
 