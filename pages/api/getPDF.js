import axios from 'axios';


export default async function handler(req,res) {
  try {
    const { method, url } = req;

    if (method === 'GET') {
      const queryParams = new URLSearchParams(url.split('?')[1]); // Extract query parameters
      const pdfUrl = queryParams.get('pdf');
      function extractFilename(url) {
        var filename = url.split('/').pop().replace('.pdf','');
        return filename;
    }
      if (pdfUrl) {
        // Stream PDF content directly to the response
        const pdfResponse = await axios.get(pdfUrl, { responseType: 'stream' });
        const fileName = `${extractFilename(pdfUrl)}.pdf`; // Set filename here
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        pdfResponse.data.pipe(res);
      } else {
        res.statusCode = 400;
        res.end('PDF URL not provided');
      }
    } else {
      res.statusCode = 405; // Method Not Allowed
      res.end('Method Not Allowed');
    }
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
