const API_KEY = process.env.TELNYX_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  try {
    // Fetch usage data grouped by from_number to identify which numbers sent messages
    const url = `https://api.telnyx.com/v2/usage_reports?product=messaging&dimensions=from_number,direction&metrics=cost,parts,count&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&page[size]=500`;

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

    const data = await response.json();
    let allData = data.data || [];

    // Fetch all pages
    let meta = data.meta || {};
    let currentPage = 1;
    while (meta.total_pages && currentPage < meta.total_pages && currentPage < 20) {
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
      } else break;
    }

    // Fetch phone number to campaign mappings
    const phoneNumbersUrl = 'https://api.telnyx.com/10dlc/phoneNumberCampaign?recordsPerPage=500';
    const phoneResponse = await fetch(phoneNumbersUrl, {
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
            brandDisplayName: record.brandDisplayName || record.brandId
          };
        }
      });
    }

    // Fetch brands to get display names
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

    // Aggregate data by brand
    const brandStats = {};
    allData.forEach(item => {
      const fromNumber = item.from_number || '';
      const direction = item.direction || '';
      const count = Number(item.count) || 0;
      const cost = Number(item.cost) || 0;
      const parts = Number(item.parts) || 0;

      // Only count outbound messages for "top performers"
      if (direction !== 'outbound') return;

      // Look up brand from phone number
      const phoneInfo = phoneNumberMap[fromNumber];
      let brandName = 'Unknown';
      let brandId = 'unknown';

      if (phoneInfo) {
        brandId = phoneInfo.brandId;
        brandName = brandMap[brandId] || phoneInfo.brandDisplayName || brandId;
      }

      if (!brandStats[brandId]) {
        brandStats[brandId] = {
          brandId,
          brandName,
          outbound: 0,
          inbound: 0,
          cost: 0,
          parts: 0
        };
      }

      brandStats[brandId].outbound += count;
      brandStats[brandId].cost += cost;
      brandStats[brandId].parts += parts;
    });

    // Also add inbound counts
    allData.forEach(item => {
      const direction = item.direction || '';
      if (direction !== 'inbound') return;
      
      const toNumber = item.to_number || '';
      const count = Number(item.count) || 0;
      
      const phoneInfo = phoneNumberMap[toNumber];
      if (phoneInfo) {
        const brandId = phoneInfo.brandId;
        if (brandStats[brandId]) {
          brandStats[brandId].inbound += count;
        }
      }
    });

    // Convert to array and sort by outbound messages (highest first)
    const sortedBrands = Object.values(brandStats)
      .filter(b => b.brandName !== 'Unknown')
      .sort((a, b) => b.outbound - a.outbound);

    return res.status(200).json({ data: sortedBrands });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
