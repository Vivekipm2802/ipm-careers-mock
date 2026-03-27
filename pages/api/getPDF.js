import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const queryParams = new URLSearchParams(req.url.split('?')[1]);
    const pdfUrl = queryParams.get('pdf');

    if (!pdfUrl) {
      return res.status(400).json({ success: false, message: 'PDF URL not provided' });
    }

    function extractFilename(url) {
      return url.split('/').pop().replace('.pdf', '') || 'document';
    }

    const pdfResponse = await axios.get(pdfUrl, { responseType: 'stream' });
    const fileName = `${extractFilename(pdfUrl)}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/pdf');
    pdfResponse.data.pipe(res);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch PDF' });
  }
}
