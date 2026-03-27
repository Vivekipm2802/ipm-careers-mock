import axios from 'axios';

/**
 * Allowed hostname patterns for the PDF proxy.
 * Only URLs matching these domains will be fetched.
 * Supabase storage is the primary source for PDFs.
 */
const ALLOWED_HOST_PATTERNS = [
  '.supabase.co',
  '.supabase.in',
  'msxeahieemrylklgruhl.supabase.co',
];

function isAllowedPdfUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    // Block non-HTTP(S) protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // Block internal/private IPs
    const host = parsed.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host.startsWith('192.168.') ||
      host === '169.254.169.254' ||
      host === '[::1]' ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    // Check against allowed patterns
    return ALLOWED_HOST_PATTERNS.some(
      (pattern) => host === pattern || host.endsWith(pattern)
    );
  } catch {
    return false;
  }
}

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

    if (!isAllowedPdfUrl(pdfUrl)) {
      return res.status(403).json({
        success: false,
        message: 'URL not allowed — only Supabase storage URLs are permitted',
      });
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
    return res.status(500).json({ success: false, message: 'Failed to fetch PDF' });
  }
}
