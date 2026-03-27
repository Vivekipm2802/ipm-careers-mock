import { push } from '@/templates/push';
import { getTransporter, getFromAddress } from '@/lib/emailTransporter';

// Define the function to send the email
const sendEmail = async ({ student_name,module_name,datetime,schedules ,email }) => {
  try {
    const transporter = getTransporter();
    const htmlTemplate = push({student_name,module_name,datetime,schedules:`https://study.ipmcareer.in/class/${schedules}`});
    // Create the email message
    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: `Hi ${student_name} , Your Class Booking has been confirmed.`,
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
    const data = req?.body?.record;

    if (!data) {
      return res.status(400).json({ success: false, message: 'Missing request body or record' });
    }

    const { student_name, module_name, datetime, schedules, email } = data;

    if (!student_name || !module_name || !datetime || !schedules || !email) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await sendEmail({ student_name, module_name, datetime, schedules, email });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
