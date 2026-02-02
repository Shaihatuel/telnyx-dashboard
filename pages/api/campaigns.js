const API_KEY = process.env.TELNYX_API_KEY;

export default async function handler(req, res) {
  const { brandId } = req.query;
  
  try {
    let allCampaigns = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      let url = `https://api.telnyx.com/v2/10dlc/campaign?page[number]=${page}&page[size]=100`;
      if (brandId && brandId !== 'all') {
        url += `&brandId=${brandId}`;
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
      const campaigns = result.records || result.data || [];
      allCampaigns = [...allCampaigns, ...campaigns];

      // Check if there are more pages
      const meta = result.meta || {};
      const totalPages = meta.total_pages || meta.totalPages || 1;
      
      if (page >= totalPages || campaigns.length === 0) {
        hasMore = false;
      } else {
        page++;
      }

      // Safety limit
      if (page > 50) {
        hasMore = false;
      }
    }

    return res.status(200).json({ data: allCampaigns });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
