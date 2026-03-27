import { PINtemplate } from '@/templates/pintemplate';
import { getTransporter, getFromAddress } from '@/lib/emailTransporter';

// Define the function to send the email
const sendEmail = async ({ email, token }) => {
  try {
    const transporter = getTransporter();
    const htmlTemplate = PINtemplate({email:email,token:token});
    // Create the email message
    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: `Please set up your PIN for IPM Careers Study Account :  ${email}`,
      html: htmlTemplate,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    return { success: false, message: 'Error sending email' };
  }
};

// Define your Next.js API route
export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const record = req?.body?.record;

    if (!record) {
      return res.status(400).json({ success: false, message: 'Missing request body or record' });
    }

    const { email, token } = record;

    if (!email || !token) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await sendEmail({ email, token });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
