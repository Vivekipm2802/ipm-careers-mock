export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  
    const MAX_ATTEMPTS = 10;
    let attempt = 0;
    let result = null;
  
    while (attempt < MAX_ATTEMPTS) {
      try {
        const response = await fetch('https://openaitest-1gl9.onrender.com/api/generate-rc');
        result = await response.json();
  
        console.log(`Attempt ${attempt + 1}:`, result);
  
        if (result.success) {
          return res.status(200).json({ success: true, message: 'Generated Word Successfully' });
        }
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
      }
  
      attempt++;
    }
  
    return res.status(400).json({ success: false, message: 'Failed to generate word after 10 attempts' });
  }
  