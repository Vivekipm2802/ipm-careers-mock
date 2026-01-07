export default async function handler(req, res) {
  try {
    const url = req.query.url;

    if (!url) {
      return res.status(400).json({ error: "URL missing" });
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
    res.status(500).json({ error: err.message });
  }
}
