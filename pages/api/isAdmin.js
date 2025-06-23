// pages/api/checkEmail.js
const storedEmails = ['officialnmn@gmail.com', 'ipmcareeronline@gmail.com'];

export default (req, res) => {
  if (req.method === 'POST') {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    if (storedEmails.includes(email)) {
      res.status(200).json({ success: true, message: 'Email found in the array' });
    } else {
      res.status(200).json({ success: false, message: 'Email not found in the array' });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
};
