export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.TELNYX_API_KEY;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  try {
    // Fetch all campaigns (which include brand info)
    const campaignsUrl = 'https://api.telnyx.com/10dlc/campaign?recordsPerPage=500';
    const campaignsResponse = await fetch(campaignsUrl, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let campaignToBrand = {};
    let brandNames = {};
    
    if (campaignsResponse.ok) {
      const campaignsData = await campaignsResponse.json();
      const records = campaignsData.records || [];
      records.forEach(campaign => {
        if (campaign.campaignId && campaign.brandId) {
          campaignToBrand[campaign.campaignId] = campaign.brandId;
          campaignToBrand[campaign.tcrCampaignId] = campaign.brandId;
          brandNames[campaign.brandId] = campaign.brandDisplayName || campaign.brandId;
        }
      });
    }

    // Fetch all phone number campaign assignments
    const phoneUrl = 'https://api.telnyx.com/v2/10dlc/phone_number_campaigns?page[size]=500';
    const phoneResponse = await fetch(phoneUrl, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let phoneNumberMap = {};
    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      const records = phoneData.data || [];
      records.forEach(record => {
        const phone = record.phoneNumber || record.phone_number;
        const campaignId = record.campaignId || record.telnyxCampaignId;
        const brandId = record.brandId || campaignToBrand[campaignId];
        if (phone && brandId) {
          phoneNumberMap[phone] = {
            brandId: brandId,
            brandName: brandNames[brandId] || brandId
          };
        }
      });
    }

    // Fetch usage data
    const usageUrl = `https://api.telnyx.com/v2/usage_reports?product=messaging&dimensions=from_number,direction&metrics=cost,parts,count&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&page[size]=500`;
    
    const usageResponse = await fetch(usageUrl, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!usageResponse.ok) {
      const errorText = await usageResponse.text();
      return res.status(usageResponse.status).json({ error: errorText });
    }

    const usageData = await usageResponse.json();
    let allUsage = usageData.data || [];

    // Fetch more pages if needed
    let meta = usageData.meta || {};
    let currentPage = 1;
    while (meta.total_pages && currentPage < meta.total_pages && currentPage < 10) {
      currentPage++;
      const pageUrl = `${usageUrl}&page[number]=${currentPage}`;
      const pageResponse = await fetch(pageUrl, {
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
      });
      if (pageResponse.ok) {
        const pageData = await pageResponse.json();
        allUsage = [...allUsage, ...(pageData.data || [])];
        meta = pageData.meta || {};
      } else break;
    }

    // Aggregate by brand
    const brandStats = {};
    
    allUsage.forEach(item => {
      const fromNumber = item.from_number || '';
      const direction = item.direction || '';
      const count = Number(item.count) || 0;
      const cost = Number(item.cost) || 0;
      const parts = Number(item.parts) || 0;

      // Only count outbound for rankings
      if (direction !== 'outbound') return;

      const phoneInfo = phoneNumberMap[fromNumber];
      if (!phoneInfo) return;

      const brandId = phoneInfo.brandId;
      const brandName = phoneInfo.brandName;

      if (!brandStats[brandId]) {
        brandStats[brandId] = { brandId, brandName, outbound: 0, cost: 0, parts: 0 };
      }

      brandStats[brandId].outbound += count;
      brandStats[brandId].cost += cost;
      brandStats[brandId].parts += parts;
    });

    // Sort by outbound (highest first)
    const sortedBrands = Object.values(brandStats).sort((a, b) => b.outbound - a.outbound);

    return res.status(200).json({ data: sortedBrands });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
