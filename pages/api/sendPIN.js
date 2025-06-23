import { PINtemplate } from '@/templates/pintemplate';

// Import the nodemailer library
const nodemailer = require('nodemailer');

// Define your email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.zeptomail.in',
  port: 465,
  secure: true,
  auth: {
    user: 'emailapikey',
    pass: 'PHtE6r1fS7y93mYmoRFVt6S9F5GtMd98r74yeFNG4oxKA/BRG00A+YsskGO1okwrVqERHKKTzt884rjNt7rQdD25Yz0eWGqyqK3sx/VYSPOZsbq6x00ct14ZdULaV4fndd5u3Sffvt/cNA==',
  },
  });

// Define the function to send the email
const sendEmail = async ({ email, token }) => {
  try {

    const htmlTemplate = PINtemplate({email:email,token:token});
    // Create the email message
    const mailOptions = {
      from: '"IPM Careers" <info@ipmcareer.in>',
      to: email,
      subject: `Please set up your PIN for IPM Careers Study Account :  ${email}`,
      html: htmlTemplate,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent: ', info.response);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email: ', error);
    return { success: false, message: 'Error sending email' };
  }
};

// Define your Next.js API route
export default async (req, res) => {
 
  if (req.method === 'POST') {
    const data = req?.body;
 const { email, token } = data?.record;
    // Check if all required fields are present
    if (!email || !token) {
        
      return res.status(400).json({ success: false, message: 'Mising required fields',data:req.body });
    }

    // Send the email
    const result = await sendEmail({ email, token });

    // Respond based on the result of sending the email
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } else {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
};
