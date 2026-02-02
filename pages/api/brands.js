const API_KEY = process.env.TELNYX_API_KEY;

export default async function handler(req, res) {
  try {
    let allBrands = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Use the correct Telnyx 10DLC endpoint (without /v2/)
      const url = `https://api.telnyx.com/10dlc/brand?page=${page}&recordsPerPage=100`;

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
      const brands = result.records || [];
      allBrands = [...allBrands, ...brands];

      // Check pagination using totalRecords
      const totalRecords = result.totalRecords || brands.length;
      const currentPage = result.page || page;
      
      // If we've fetched all records, stop
      if (allBrands.length >= totalRecords || brands.length === 0) {
        hasMore = false;
      } else {
        page++;
      }

      // Safety limit
      if (page > 20) hasMore = false;
    }

    // Sort alphabetically by displayName
    allBrands.sort((a, b) => {
      const nameA = (a.displayName || a.companyName || '').toLowerCase();
      const nameB = (b.displayName || b.companyName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return res.status(200).json({ data: allBrands, total: allBrands.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
