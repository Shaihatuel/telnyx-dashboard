const API_KEY = process.env.TELNYX_API_KEY;

export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.telnyx.com/v2/10dlc/brand', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const result = await response.json();
    return res.status(200).json({ data: result.records || result.data || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
