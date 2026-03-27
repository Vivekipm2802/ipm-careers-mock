import { getTestTemplate } from '@/templates/testTemplate';
import { getTransporter, getFromAddress } from '@/lib/emailTransporter';

// Define the function to send the email
const sendEmail = async (name,test,link,email) => {
  try {
    const transporter = getTransporter();
    const htmlTemplate = getTestTemplate(name,test,link);
    // Create the email message
    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: `Hi ${name} , Your Report for ${test} has been successfully generated.`,
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
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const data = req?.body?.record;

    if (!data) {
      return res.status(400).json({ success: false, message: 'Missing request body or record' });
    }

    const { test, name, email, uid } = data;

    if (!test || !name || !email || !uid) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const link = `https://study.ipmcareer.com/mock/result/${uid}`;
    const result = await sendEmail(name, test, link, email);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in sendTest:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
