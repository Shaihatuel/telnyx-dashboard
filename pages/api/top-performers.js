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
    // Fetch brands first
    const brandsUrl = 'https://api.telnyx.com/10dlc/brand?recordsPerPage=100';
    const brandsResponse = await fetch(brandsUrl, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let brandMap = {};
    if (brandsResponse.ok) {
      const brandsData = await brandsResponse.json();
      const records = brandsData.records || [];
      records.forEach(brand => {
        brandMap[brand.brandId] = brand.displayName || brand.companyName || brand.brandId;
      });
    }

    // Fetch phone number to campaign/brand mappings
    const phoneUrl = 'https://api.telnyx.com/10dlc/phoneNumberCampaign?recordsPerPage=500';
    const phoneResponse = await fetch(phoneUrl, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let phoneNumberMap = {};
    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      const records = phoneData.records || [];
      records.forEach(record => {
        if (record.phoneNumber && record.brandId) {
          phoneNumberMap[record.phoneNumber] = {
            brandId: record.brandId,
            brandName: brandMap[record.brandId] || record.brandId
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

    // Aggregate by brand
    const brandStats = {};
    
    allUsage.forEach(item => {
      const fromNumber = item.from_number || '';
      const direction = item.direction || '';
      const count = Number(item.count) || 0;
      const cost = Number(item.cost) || 0;
      const parts = Number(item.parts) || 0;

      if (direction !== 'outbound') return;

      const phoneInfo = phoneNumberMap[fromNumber];
      if (!phoneInfo) return;

      const brandId = phoneInfo.brandId;
      const brandName = phoneInfo.brandName;

      if (!brandStats[brandId]) {
        brandStats[brandId] = {
          brandId,
          brandName,
          outbound: 0,
          cost: 0,
          parts: 0
        };
      }

      brandStats[brandId].outbound += count;
      brandStats[brandId].cost += cost;
      brandStats[brandId].parts += parts;
    });

    // Sort by outbound messages (highest first)
    const sortedBrands = Object.values(brandStats)
      .sort((a, b) => b.outbound - a.outbound);

    return res.status(200).json({ data: sortedBrands });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
