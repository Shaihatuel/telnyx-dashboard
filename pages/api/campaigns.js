const API_KEY = process.env.TELNYX_API_KEY;

export default async function handler(req, res) {
  const { brandId } = req.query;
  
  try {
    let url = 'https://api.telnyx.com/v2/10dlc/campaign';
    if (brandId && brandId !== 'all') {
      url += `?brandId=${brandId}`;
    }

    const response = await fetch(url, {
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
