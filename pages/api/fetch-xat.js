/**
 * Allowed hostname patterns for the XAT proxy.
 * Only URLs matching these domains will be fetched.
 */
const ALLOWED_HOSTS = [
  'xatonline.in',
  'www.xatonline.in',
  'digialm.com',
  'www.digialm.com',
  'cdn.digialm.com',
];

function isAllowedUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    // Block non-HTTP(S) protocols (file://, ftp://, data:, etc.)
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
    return ALLOWED_HOSTS.includes(host);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const url = req.query.url;

    if (!url) {
      return res.status(400).json({ error: "URL missing" });
    }

    if (!isAllowedUrl(url)) {
      return res.status(403).json({
        error: "URL not allowed — only xatonline.in and digialm.com domains are permitted",
      });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html",
        Referer: "https://xatonline.in/",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Digialm blocked the request (${response.status})`,
      });
    }

    const html = await response.text();
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch the requested page" });
  }
}
