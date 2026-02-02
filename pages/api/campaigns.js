const API_KEY = process.env.TELNYX_API_KEY;

export default async function handler(req, res) {
  const { brandId } = req.query;
  
  try {
    let allCampaigns = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Use the correct Telnyx 10DLC endpoint (without /v2/)
      let url = `https://api.telnyx.com/10dlc/campaign?page=${page}&recordsPerPage=100`;
      if (brandId && brandId !== 'all') {
        url += `&brandId=${brandId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const result = await response.json();
      
      // Telnyx 10DLC API returns data in "records"
      const campaigns = result.records || [];
      allCampaigns = [...allCampaigns, ...campaigns];

      // Check pagination using totalRecords
      const totalRecords = result.totalRecords || campaigns.length;
      
      if (allCampaigns.length >= totalRecords || campaigns.length === 0) {
        hasMore = false;
      } else {
        page++;
      }

      // Safety limit
      if (page > 20) hasMore = false;
    }

    return res.status(200).json({ data: allCampaigns, total: allCampaigns.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
