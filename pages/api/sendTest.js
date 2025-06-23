import { push } from '@/templates/push';
import { getTestTemplate } from '@/templates/testTemplate';


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
const sendEmail = async (name,test,link,email) => {
  try {

    const htmlTemplate = getTestTemplate(name,test,link);
    // Create the email message
    const mailOptions = {
      from: '"IPM Careers" <info@ipmcareer.in>',
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
 
  if (req.method === 'POST') {
    const data = req?.body?.record;
   /*  if(data.config.send_email != true){
res.status(200).json({error:true,message:'this email should not be sent'});
        return null
    } */
 const { test,name,email,uid } = data;
    // Check if all required fields are present
    if (!test || !name  || !email || !uid) {
        
      return res.status(400).json({ success: false, message: 'Mising required fields',data:req.body });
    }

    const link = `https://study.ipmcareer.com/mock/result/${uid}`
    const result = await sendEmail( name , test , link ,email);

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
