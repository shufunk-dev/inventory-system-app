import axios from 'axios';

let tokenCache = {
  token: null,
  expiresAt: 0,
  keyHash: ''
};

/**
 * Fetches or returns cached OAuth 2.0 application access token for eBay API.
 * @param {string} clientId - eBay App ID
 * @param {string} clientSecret - eBay Cert ID
 * @returns {Promise<string|null>}
 */
export async function getEbayAccessToken(clientId, clientSecret) {
  if (!clientId || !clientSecret) return null;

  const keyHash = `${clientId}:${clientSecret}`;
  const now = Date.now();

  // Return cached token if valid (with 60-second buffer)
  if (tokenCache.token && tokenCache.keyHash === keyHash && tokenCache.expiresAt > now + 60000) {
    return tokenCache.token;
  }

  try {
    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    const res = await axios.post(
      'https://api.ebay.com/identity/v1/oauth2/token',
      'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        },
        timeout: 8000
      }
    );

    if (res.data && res.data.access_token) {
      const expiresInMs = (res.data.expires_in || 7200) * 1000;
      tokenCache = {
        token: res.data.access_token,
        expiresAt: now + expiresInMs,
        keyHash
      };
      return tokenCache.token;
    }
  } catch (e) {
    console.warn('[eBay API] OAuth authentication failed:', e.response?.data || e.message);
  }
  return null;
}

/**
 * Fetches market price summary from eBay Browse API.
 * @param {string} query - Clean product title / query
 * @param {Object} options - Configuration options
 * @param {string} [options.barcode] - UPC / ISBN / GTIN if available
 * @param {string} options.ebayClientId - eBay App ID
 * @param {string} options.ebayClientSecret - eBay Cert ID
 * @param {string} [options.marketplaceId='EBAY_US'] - eBay Marketplace ID
 * @returns {Promise<{price: number, minPrice: number, maxPrice: number, count: number, title: string, url: string, source: string}|null>}
 */
export async function fetchEbayMarketPrice(query, options = {}) {
  const { ebayClientId, ebayClientSecret, marketplaceId = 'EBAY_US', barcode } = options;

  if (!ebayClientId || !ebayClientSecret) {
    return null;
  }

  const token = await getEbayAccessToken(ebayClientId, ebayClientSecret);
  if (!token) return null;

  try {
    let endpoint = `https://api.ebay.com/buy/browse/v1/item_summary/search?limit=10&sort=price`;

    const cleanBarcode = barcode ? barcode.replace(/[^0-9X]/gi, '') : '';
    if (cleanBarcode && (cleanBarcode.length === 10 || cleanBarcode.length === 12 || cleanBarcode.length === 13)) {
      endpoint += `&gtin=${encodeURIComponent(cleanBarcode)}`;
    } else if (query && query.trim()) {
      endpoint += `&q=${encodeURIComponent(query.trim())}`;
    } else {
      return null;
    }

    const res = await axios.get(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': marketplaceId.trim() || 'EBAY_US'
      },
      timeout: 8000
    });

    const items = res.data?.itemSummaries || [];
    if (items.length === 0) return null;

    // Filter valid numerical prices
    const prices = items
      .map(item => parseFloat(item.price?.value))
      .filter(p => !isNaN(p) && p > 0);

    if (prices.length === 0) return null;

    // Calculate median / average price
    const sum = prices.reduce((acc, val) => acc + val, 0);
    const avgPrice = Math.round((sum / prices.length) * 100) / 100;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
      price: avgPrice,
      minPrice,
      maxPrice,
      count: items.length,
      title: items[0].title || query,
      url: items[0].itemWebUrl || null,
      source: 'ebay'
    };
  } catch (e) {
    console.warn('[eBay API] Search request failed:', e.response?.data || e.message);
  }

  return null;
}
