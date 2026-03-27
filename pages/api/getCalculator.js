import fs from 'fs';
import path from 'path';

export default async function api(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const filename = path.join(process.cwd(), 'pages', 'api', 'static', 'calculator.html');

    if (!fs.existsSync(filename)) {
      return res.status(404).json({ success: false, message: 'Calculator file not found' });
    }

    const html = fs.readFileSync(filename, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error in getCalculator:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
