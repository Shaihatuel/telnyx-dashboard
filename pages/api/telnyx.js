const API_KEY = process.env.TELNYX_API_KEY;
const BASE_URL = "https://api.telnyx.com/v2";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  try {
    const url = `${BASE_URL}/usage_reports?product=messaging&dimensions=date,direction,normalized_carrier,status_v2&metrics=cost,parts,count&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&page[size]=500`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Telnyx API Error: ${response.status}`, details: errorText });
    }

    const data = await response.json();
    let allData = data.data || [];
    let meta = data.meta || {};
    let currentPage = 1;
    
    while (meta.total_pages && currentPage < meta.total_pages && currentPage < 10) {
      currentPage++;
      const pageUrl = `${url}&page[number]=${currentPage}`;
      const pageResponse = await fetch(pageUrl, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pageResponse.ok) {
        const pageData = await pageResponse.json();
        allData = [...allData, ...(pageData.data || [])];
        meta = pageData.meta || {};
      } else {
        break;
      }
    }

    return res.status(200).json({ data: allData, meta });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch from Telnyx', details: error.message });
  }
}
