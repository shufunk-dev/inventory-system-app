import axios from 'axios';
import * as jose from 'jose';

let cachedGcpAccessToken = null;
let cachedGcpAccessTokenExpiresAt = 0;

/**
 * Signs a JWT client assertion and requests a GCP OAuth2 access token.
 */
export async function getGcpAccessToken(credentialsJson) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedGcpAccessToken && now < cachedGcpAccessTokenExpiresAt - 60) {
    return cachedGcpAccessToken;
  }

  if (!credentialsJson) {
    throw new Error('Missing credentials JSON');
  }

  const creds = JSON.parse(credentialsJson);
  const clientEmail = creds.client_email;
  const privateKeyPem = creds.private_key;
  if (!clientEmail || !privateKeyPem) {
    throw new Error('Invalid service account credentials format');
  }

  const jwtPayload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const alg = 'RS256';
  const privateKey = await jose.importPKCS8(privateKeyPem, alg);
  const assertion = await new jose.SignJWT(jwtPayload)
    .setProtectedHeader({ alg })
    .sign(privateKey);

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', assertion);

  const response = await axios.post('https://oauth2.googleapis.com/token', params, { timeout: 10000 });
  cachedGcpAccessToken = response.data.access_token;
  cachedGcpAccessTokenExpiresAt = now + (response.data.expires_in || 3600);
  return cachedGcpAccessToken;
}

/**
 * Queries the Vertex AI Search (Discovery Engine) API for pricing details.
 */
export async function fetchVertexAiSearchPrice(name, extraKeywords = '', config = {}) {
  const { projectId, dataStoreId, location = 'global', credentialsJson } = config;

  if (!projectId || !dataStoreId || !credentialsJson || !name) return null;

  try {
    const accessToken = await getGcpAccessToken(credentialsJson);
    const q = `${name} ${extraKeywords}`.replace(/\s+/g, ' ').trim();
    const url = `https://discoveryengine.googleapis.com/v1/projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}/servingConfigs/default_search:search`;

    const requestBody = {
      query: q,
      pageSize: 10,
      contentSearchSpec: {
        snippetSpec: {
          returnSnippet: true
        }
      }
    };

    const res = await axios.post(url, requestBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (res.data && res.data.results && res.data.results.length > 0) {
      let prices = [];
      
      for (const result of res.data.results) {
        const doc = result.document;
        if (!doc || !doc.derivedStructData) continue;
        
        const structData = doc.derivedStructData;
        
        if (structData.pagemap) {
          if (Array.isArray(structData.pagemap.offer)) {
            for (const offer of structData.pagemap.offer) {
              if (offer.price) {
                const val = parseFloat(offer.price.replace(/[^0-9.]/g, ''));
                if (!isNaN(val) && val > 0 && val < 50000) {
                  prices.push(val);
                }
              }
            }
          }
          if (Array.isArray(structData.pagemap.product)) {
            for (const product of structData.pagemap.product) {
              if (product.price) {
                const val = parseFloat(product.price.replace(/[^0-9.]/g, ''));
                if (!isNaN(val) && val > 0 && val < 50000) {
                  prices.push(val);
                }
              }
            }
          }
        }
        
        let text = structData.title || '';
        if (Array.isArray(structData.snippets)) {
          for (const s of structData.snippets) {
            if (s.snippet) text += ' ' + s.snippet;
          }
        } else if (structData.snippet) {
          text += ' ' + structData.snippet;
        }

        const priceMatches = text.match(/\$[0-9,]+(?:\.[0-9]{2})?/g);
        if (priceMatches) {
          for (const match of priceMatches) {
            const val = parseFloat(match.replace(/[^0-9.]/g, ''));
            if (!isNaN(val) && val > 0 && val < 50000) {
              prices.push(val);
            }
          }
        }
      }
      
      prices = [...new Set(prices)].sort((a, b) => a - b);
      
      if (prices.length > 0) {
        if (prices.length >= 4) {
          const trimCount = Math.max(1, Math.floor(prices.length * 0.15));
          prices = prices.slice(trimCount, prices.length - trimCount);
        }
        
        const sum = prices.reduce((acc, p) => acc + p, 0);
        const avg = sum / prices.length;
        
        return {
          valueLow: parseFloat(prices[0].toFixed(2)),
          valueAvg: parseFloat(avg.toFixed(2)),
          valueHigh: parseFloat(prices[prices.length - 1].toFixed(2))
        };
      }
    }
  } catch (e) {
    console.error('[Archived Vertex AI Search] Price error:', e.message);
  }
  return null;
}
