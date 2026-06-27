import axios from 'axios';
import { getDb, getGlobalDb } from './db.js';
import fs from 'fs/promises';
import path from 'path';
import FormData from 'form-data';

let isWorking = false;

// Helpers to fetch from various APIs
async function fetchGoogleBooks(isbn) {
  try {
    const res = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, { timeout: 4000 });
    if (res.data && res.data.items && res.data.items.length > 0) {
      // Find the exact ISBN match if possible, otherwise fallback to the first item
      let bestItem = res.data.items[0];
      const cleanIsbn = isbn.replace(/[^X0-9]/gi, '').toUpperCase();
      
      for (const item of res.data.items) {
        const idents = item.volumeInfo?.industryIdentifiers || [];
        const hasExactMatch = idents.some(id => {
          const cleanId = id.identifier.replace(/[^X0-9]/gi, '').toUpperCase();
          return cleanId === cleanIsbn;
        });
        if (hasExactMatch) {
          bestItem = item;
          break;
        }
      }
      
      const volumeInfo = bestItem.volumeInfo;
      return {
        name: volumeInfo.title || null,
        imageUrl: volumeInfo.imageLinks?.thumbnail || null,
        description: volumeInfo.description || null
      };
    }
  } catch (e) {
    if (e.response && e.response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    console.error('Google Books API error:', e.message);
  }
  return null;
}

const cleanTitle = (title) => {
  if (!title) return '';
  let cleaned = title.replace(/\s*[-|]\s*(eBay|Amazon|Walmart|Target|GameStop|Etsy|Tested|for sale online|brand new)\b/gi, '');
  cleaned = cleaned.replace(/\s+for sale online\s*$/gi, '');
  // Strip anything from a trailing '[' to the end of the string (e.g., "[Pre-Owned]")
  cleaned = cleaned.replace(/\s*\[.*$/g, '');
  // Strip trailing ellipses
  cleaned = cleaned.replace(/\s*\.\.\.$/g, '');
  return cleaned.trim();
};

async function fetchGoogleVision(imagePath) {
  if (!process.env.GOOGLE_VISION_API_KEY) {
    console.warn('[Worker] GOOGLE_VISION_API_KEY not set. Skipping image recognition.');
    return null;
  }
  
  try {
    let base64Image = '';
    if (imagePath.startsWith('http')) {
      const imgRes = await axios.get(imagePath, { responseType: 'arraybuffer', timeout: 10000 });
      base64Image = Buffer.from(imgRes.data, 'binary').toString('base64');
    } else {
      let absolutePath = '';
      if (imagePath.startsWith('/api/file/') || imagePath.startsWith('/uploads/')) {
        const filename = imagePath.split('/').pop();
        absolutePath = path.join(process.env.USER_DATA_PATH || process.cwd(), 'uploads', filename);
      } else {
        absolutePath = path.join(process.cwd(), 'public', imagePath);
      }
      const fileBuffer = await fs.readFile(absolutePath);
      base64Image = fileBuffer.toString('base64');
    }

    const res = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
      requests: [{
        image: { content: base64Image },
        features: [
          { type: "WEB_DETECTION" },
          { type: "TEXT_DETECTION" },
          { type: "LOGO_DETECTION" },
          { type: "LABEL_DETECTION" }
        ]
      }]
    });

    const response = res.data.responses[0];
    if (!response) return null;

    let bestName = null;
    let descriptionParts = ['[Identified via Google Vision AI]'];

    const genericTerms = [
      'art', 'font', 'rectangle', 'meter', 'video game', 'games', 'electronics', 'gadget', 
      'toy', 'box', 'text', 'logo', 'brand', 'pattern', 'design', 'illustration', 'drawing', 'paper',
      'nintendo', 'nintendo entertainment system', 'nes', 'super nintendo', 'snes', 'playstation', 
      'playstation 2', 'playstation 3', 'playstation 4', 'ps2', 'ps3', 'ps4', 'xbox', 'xbox 360', 
      'sega', 'genesis', 'konami', 'capcom', 'electronic arts', 'ea', 'ubisoft', 'activision', 'square enix',
      'hand', 'finger', 'thumb', 'fingers', 'skin', 'nail', 'arm', 'person', 'h&m', 'money', 'currency', 'silver', 'gold', 'coin', 'coins', 'cash',
      'bottle', 'glass bottle', 'drink', 'beverage', 'can', 'soda can', 'water bottle', 'liquid', 'liqueur', 'liquor', 'alcohol', 'alcoholic drink', 'energy drink',
      'glass', 'metal', 'plastic', 'wood', 'ceramic'
    ];

    const isGeneric = (str) => {
      if (!str) return true;
      const lowerStr = str.toLowerCase();
      return genericTerms.some(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        return regex.test(lowerStr);
      });
    };

    if (response.webDetection?.bestGuessLabels?.length > 0 && response.webDetection.bestGuessLabels[0].label) {
      const guess = response.webDetection.bestGuessLabels[0].label;
      if (!isGeneric(guess)) {
        bestName = guess;
        bestName = bestName.replace(/\b\w/g, l => l.toUpperCase());
      }
    } 
    
    if (!bestName && response.webDetection?.webEntities?.length > 0) {
      const validEntities = response.webDetection.webEntities.filter(e => 
        e.description && !isGeneric(e.description)
      );

      if (validEntities.length > 0) {
        validEntities.sort((a, b) => {
          const aWords = a.description.split(' ').length;
          const bWords = b.description.split(' ').length;
          const aScore = a.score + (aWords > 1 && aWords < 6 ? 0.3 : 0);
          const bScore = b.score + (bWords > 1 && bWords < 6 ? 0.3 : 0);
          return bScore - aScore;
        });

        bestName = validEntities[0].description;
      }
    }

    // 2.5 Fallback to Logo if it couldn't find a valid entity
    let logoName = null;
    if (!bestName && response.logoAnnotations?.length > 0) {
      logoName = response.logoAnnotations[0].description;
      bestName = logoName;
    }

    if (response.textAnnotations?.length > 0) {
      const lines = response.textAnnotations[0].description.split('\n')
        .map(l => l.trim().replace(/-/g, ' ').replace(/\s+/g, ' ')) // Clean up dashes
        .filter(l => l.length > 3 && !isGeneric(l));
        
      if (lines.length > 0) {
        // If we found a logo, try to find where it appears in the OCR text and grab the next few words
        if (logoName) {
          const logoIndex = lines.findIndex(l => l.toLowerCase().includes(logoName.toLowerCase()));
          if (logoIndex !== -1) {
            // Grab the logo line and up to 2 lines after it to form the full product name
            const combinedName = lines.slice(logoIndex, logoIndex + 3).join(' ');
            if (combinedName.length > logoName.length) {
              bestName = combinedName;
            }
          }
        } else if (!bestName) {
          bestName = lines[0]; // Often the main title or publisher at the top of the box
        }
        
        if (bestName) {
          bestName = bestName.replace(/\b\w/g, l => l.toUpperCase());
        }
      }
    }

    // 2. Logos/Brands
    if (response.logoAnnotations?.length > 0) {
      const logos = response.logoAnnotations.map(l => l.description).join(', ');
      descriptionParts.push(`Brands/Logos: ${logos}`);
    }

    // 3. Extracted Text (OCR) - Critical for baseball cards and coins
    if (response.textAnnotations?.length > 0) {
      // The first element contains the entire text block
      const fullText = response.textAnnotations[0].description.replace(/\n/g, ' - ');
      descriptionParts.push(`Detected Text: ${fullText}`);
    }

    // 4. Labels/Categories
    if (response.labelAnnotations?.length > 0) {
      const labels = response.labelAnnotations.map(l => l.description).slice(0, 5).join(', ');
      descriptionParts.push(`Tags: ${labels}`);
    }

    if (bestName || descriptionParts.length > 1) {
      return {
        name: bestName || 'Unknown Item (Needs Review)',
        description: descriptionParts.join('\n\n')
      };
    }
  } catch (e) {
    if (e.response && e.response.data) {
      console.error('Google Vision API error:', JSON.stringify(e.response.data, null, 2));
    } else {
      console.error('Google Vision API error:', e.message);
    }
  }
  return null;
}

async function fetchSerpApiGoogleLens(imagePath) {
  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey) {
    console.warn('[Worker] Premium tier selected but no SERPAPI_KEY in .env.local. Falling back to Basic Vision.');
    return await fetchGoogleVision(imagePath);
  }

  try {
    let directUrl = imagePath;
    
    if (!imagePath.startsWith('http')) {
      let absolutePath = '';
      if (imagePath.startsWith('/api/file/') || imagePath.startsWith('/uploads/')) {
        const filename = imagePath.split('/').pop();
        absolutePath = path.join(process.env.USER_DATA_PATH || process.cwd(), 'uploads', filename);
      } else {
        absolutePath = path.join(process.cwd(), 'public', imagePath);
      }
      const fileBuffer = await fs.readFile(absolutePath);

      // 1. Upload to temporary host so SerpApi can see it
      const form = new FormData();
      form.append('file', fileBuffer, { filename: 'image.jpg' });

      const tmpRes = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
        headers: form.getHeaders(),
        timeout: 10000
      });

      if (!tmpRes.data || !tmpRes.data.data || !tmpRes.data.data.url) {
        console.error('[Worker] Failed to upload to tmpfiles.org');
        return await fetchGoogleVision(imagePath);
      }

      const tmpUrl = tmpRes.data.data.url;
      // tmpfiles direct download URL
      directUrl = tmpUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    }

    // 2. Query SerpApi Google Lens
    console.log(`[Worker] Querying SerpApi with URL: ${directUrl}`);
    const serpRes = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google_lens',
        url: directUrl,
        api_key: serpApiKey
      },
      timeout: 15000
    });

    if (serpRes.data && serpRes.data.knowledge_graph && serpRes.data.knowledge_graph.length > 0) {
      const bestResult = serpRes.data.knowledge_graph[0];
      return {
        name: cleanTitle(bestResult.title),
        description: `[Identified via SerpApi Premium]\n\nExact Match: ${bestResult.title}\nSubtitle: ${bestResult.subtitle || ''}`
      };
    } else if (serpRes.data && serpRes.data.visual_matches && serpRes.data.visual_matches.length > 0) {
      const bestMatch = serpRes.data.visual_matches[0];
      return {
        name: cleanTitle(bestMatch.title),
        description: `[Identified via SerpApi Premium]\n\nVisual Match: ${bestMatch.title}`
      };
    }
  } catch (e) {
    console.error('SerpApi error:', e.message);
  }

  // Fallback to basic
  console.log('[Worker] SerpApi failed or returned no results. Falling back to Basic Vision.');
  return await fetchGoogleVision(imagePath);
}

async function fetchGoogleCustomSearchPrice(name, extraKeywords = '') {
  const googleCseKey = process.env.GOOGLE_CSE_KEY;
  const googleCseCx = process.env.GOOGLE_CSE_CX;
  if (!googleCseKey || !googleCseCx || !name) return null;

  try {
    const q = `${name} ${extraKeywords}`.replace(/\s+/g, ' ').trim();
    const query = encodeURIComponent(q);
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleCseKey}&cx=${googleCseCx}&q=${query}`;
    console.log(`[Worker] Querying Google Custom Search API for prices: "${q}"`);
    const res = await axios.get(url, { timeout: 10000 });
    
    if (res.data && res.data.items && res.data.items.length > 0) {
      let prices = [];
      
      for (const item of res.data.items) {
        // 1. Try pagemap offers
        if (item.pagemap) {
          if (Array.isArray(item.pagemap.offer)) {
            for (const offer of item.pagemap.offer) {
              if (offer.price) {
                const val = parseFloat(offer.price.replace(/[^0-9.]/g, ''));
                if (!isNaN(val) && val > 0 && val < 50000) {
                  prices.push(val);
                }
              }
            }
          }
          if (Array.isArray(item.pagemap.product)) {
            for (const product of item.pagemap.product) {
              if (product.price) {
                const val = parseFloat(product.price.replace(/[^0-9.]/g, ''));
                if (!isNaN(val) && val > 0 && val < 50000) {
                  prices.push(val);
                }
              }
            }
          }
        }
        
        // 2. Parse snippet/title text for "$XX.XX" patterns
        const text = `${item.title || ''} ${item.snippet || ''}`;
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
      
      // Deduplicate and sort
      prices = [...new Set(prices)].sort((a, b) => a - b);
      
      if (prices.length > 0) {
        // Trim outliers if we have enough data points
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
    console.error('[Worker] Google Custom Search Price error:', e.message);
  }
  return null;
}

async function fetchToyMarketValue(name, condition) {
  const cleanCond = (condition && condition !== 'Unknown Condition') ? (condition === 'Loose' ? 'loose' : 'new in box') : '';
  const csePrice = await fetchGoogleCustomSearchPrice(name, `${cleanCond} toy value`);
  if (csePrice) return csePrice;

  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey || !name) return null;

  try {
    const query = encodeURIComponent(`${name} ${cleanCond}`.trim().replace(/\s+/g, ' '));
    const res = await axios.get(`https://serpapi.com/search.json?engine=google_shopping&q=${query}&api_key=${serpApiKey}`, { timeout: 15005 });
    
    if (res.data && res.data.shopping_results && res.data.shopping_results.length > 0) {
      let prices = res.data.shopping_results
        .filter(r => r.extracted_price)
        .map(r => r.extracted_price)
        .sort((a, b) => a - b);
        
      if (prices.length >= 5) {
        // Strip top 10% and bottom 10% to remove outliers
        const stripCount = Math.max(1, Math.floor(prices.length * 0.1));
        prices = prices.slice(stripCount, prices.length - stripCount);
      }

      if (prices.length > 0) {
        const valueLow = prices[0];
        const valueHigh = prices[prices.length - 1];
        const sum = prices.reduce((a, b) => a + b, 0);
        const valueAvg = +(sum / prices.length).toFixed(2);
        
        return { valueLow, valueAvg, valueHigh };
      }
    }
  } catch (e) {
    console.error('SerpApi Toy Market Fetch error:', e.message);
  }
  return null;
}

async function fetchGenericMarketValue(name) {
  const csePrice = await fetchGoogleCustomSearchPrice(name);
  if (csePrice) return csePrice;

  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey || !name) return null;

  try {
    const query = encodeURIComponent(name);
    const res = await axios.get(`https://serpapi.com/search.json?engine=google_shopping&q=${query}&api_key=${serpApiKey}`, { timeout: 10000 });
    
    if (res.data && res.data.shopping_results && res.data.shopping_results.length > 0) {
      let prices = res.data.shopping_results
        .filter(r => r.extracted_price)
        .map(r => r.extracted_price)
        .sort((a, b) => a - b);
        
      if (prices.length >= 5) {
        // Strip top 10% and bottom 10% to remove outliers
        const stripCount = Math.max(1, Math.floor(prices.length * 0.1));
        prices = prices.slice(stripCount, prices.length - stripCount);
      }

      if (prices.length > 0) {
        const valueLow = prices[0];
        const valueHigh = prices[prices.length - 1];
        const sum = prices.reduce((a, b) => a + b, 0);
        const valueAvg = +(sum / prices.length).toFixed(2);
        
        return {
          valueLow: parseFloat(valueLow.toFixed(2)),
          valueAvg: parseFloat(valueAvg.toFixed(2)),
          valueHigh: parseFloat(valueHigh.toFixed(2))
        };
      }
    }
  } catch (e) {
    console.error('SerpApi Generic Market Fetch error:', e.message);
  }
  return null;
}

async function fetchTMDBMovieMetadata(name, tmdbApiKey) {
  if (!tmdbApiKey || !name) return null;

  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(name)}`;
    const searchRes = await axios.get(searchUrl, { timeout: 10000 });
    
    if (searchRes.data && searchRes.data.results && searchRes.data.results.length > 0) {
      const movieId = searchRes.data.results[0].id;
      const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${tmdbApiKey}&append_to_response=videos,credits`;
      const detailsRes = await axios.get(detailsUrl, { timeout: 10000 });
      
      if (detailsRes.data) {
        const data = detailsRes.data;
        const moviePlot = data.overview || null;
        
        let movieCast = null;
        if (data.credits && data.credits.cast && Array.isArray(data.credits.cast)) {
          const castNames = data.credits.cast.slice(0, 8).map(c => c.name);
          movieCast = JSON.stringify(castNames);
        }
        
        let movieTrailer = null;
        if (data.videos && data.videos.results && Array.isArray(data.videos.results)) {
          // Find youtube trailer
          const trailerObj = data.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') 
            || data.videos.results.find(v => v.site === 'YouTube');
          if (trailerObj && trailerObj.key) {
            movieTrailer = `https://www.youtube.com/watch?v=${trailerObj.key}`;
          }
        }
        
        return { moviePlot, movieCast, movieTrailer };
      }
    }
  } catch (e) {
    console.error('TMDB Movie Metadata Fetch error:', e.message);
  }
  return null;
}

async function fetchSerpApiMovieMetadata(name) {
  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey || !name) return null;

  try {
    let moviePlot = null;
    let movieCast = null;
    let movieTrailer = null;

    // 1. Fetch Plot and Cast
    const query1 = encodeURIComponent(`${name} movie`);
    const res1 = await axios.get(`https://serpapi.com/search.json?q=${query1}&api_key=${serpApiKey}`, { timeout: 15000 });
    
    if (res1.data) {
      if (res1.data.knowledge_graph) {
        moviePlot = res1.data.knowledge_graph.description || null;
        if (res1.data.knowledge_graph.cast && Array.isArray(res1.data.knowledge_graph.cast)) {
          movieCast = JSON.stringify(res1.data.knowledge_graph.cast.map(c => c.name));
        }
      }
    }

    // Fallback: If no plot was found, query IMDb directly via SerpApi to get a clean snippet
    if (!moviePlot) {
      try {
        const imdbQuery = encodeURIComponent(`${name} movie site:imdb.com`);
        const imdbRes = await axios.get(`https://serpapi.com/search.json?q=${imdbQuery}&api_key=${serpApiKey}`, { timeout: 10000 });
        if (imdbRes.data && imdbRes.data.organic_results && imdbRes.data.organic_results.length > 0) {
          moviePlot = imdbRes.data.organic_results[0].snippet || null;
        }
      } catch (e) {
        console.error('SerpApi IMDb Fallback error:', e.message);
      }
    }

    // 2. Fetch Trailer explicitly using YouTube engine
    const query2 = encodeURIComponent(`${name} official trailer`);
    const res2 = await axios.get(`https://serpapi.com/search.json?engine=youtube&search_query=${query2}&api_key=${serpApiKey}`, { timeout: 15000 });
    
    if (res2.data && res2.data.video_results && res2.data.video_results.length > 0) {
      movieTrailer = res2.data.video_results[0].link;
    }

    return { moviePlot, movieCast, movieTrailer };
  } catch (e) {
    console.error('SerpApi Movie Metadata Fetch error:', e.message);
  }
  return null;
}

async function fetchVideoMarketValue(name) {
  const csePrice = await fetchGoogleCustomSearchPrice(name, '(video game OR movie OR dvd)');
  if (csePrice) return csePrice;

  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey || !name) return null;

  try {
    const query = encodeURIComponent(`${name} (video game OR movie OR dvd)`);
    const res = await axios.get(`https://serpapi.com/search.json?engine=google_shopping&q=${query}&api_key=${serpApiKey}`, { timeout: 10000 });
    
    if (res.data && res.data.shopping_results && res.data.shopping_results.length > 0) {
      let prices = res.data.shopping_results
        .map(r => r.extracted_price)
        .filter(p => p !== undefined && p > 0);
        
      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        let low = prices[0];
        let high = prices[prices.length - 1];
        let avg = prices.reduce((a, b) => a + b, 0) / prices.length;

        if (prices.length >= 3) {
          const midPrices = prices.slice(1, -1);
          avg = midPrices.reduce((a, b) => a + b, 0) / midPrices.length;
        }

        return {
          valueLow: parseFloat(low.toFixed(2)),
          valueAvg: parseFloat(avg.toFixed(2)),
          valueHigh: parseFloat(high.toFixed(2))
        };
      }
    }
  } catch (e) {
    console.error('Video Market Value search error:', e.message);
  }
  return null;
}

async function fetchCoinMarketValue(name, condition) {
  const cleanCond = (condition && condition !== 'Ungraded' && condition !== 'Unknown Condition') ? condition : '';
  const csePrice = await fetchGoogleCustomSearchPrice(name, `${cleanCond} value price estimate`);
  if (csePrice) return csePrice;

  try {
    const q = encodeURIComponent(`${name} ${cleanCond} value price estimate`.replace(/\s+/g, ' ').trim());
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return null;

    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${q}&api_key=${apiKey}`;
    const res = await axios.get(url);

    if (res.data.shopping_results && res.data.shopping_results.length > 0) {
      let prices = res.data.shopping_results
        .map(r => r.extracted_price)
        .filter(p => p !== undefined && p !== null && typeof p === 'number' && p > 0)
        .sort((a, b) => a - b);

      if (prices.length > 0) {
        if (prices.length >= 4) {
          const trimCount = Math.max(1, Math.floor(prices.length * 0.1));
          prices = prices.slice(trimCount, prices.length - trimCount);
        }
        
        const sum = prices.reduce((acc, p) => acc + p, 0);
        const avg = sum / prices.length;
        return {
          valueLow: Number(prices[0].toFixed(2)),
          valueAvg: Number(avg.toFixed(2)),
          valueHigh: Number(prices[prices.length - 1].toFixed(2))
        };
      }
    }
  } catch (err) {
    console.error('fetchCoinMarketValue error:', err.message);
  }
  return null;
}

async function fetchGradingAgencyBarcode(barcode) {
  try {
    const q = encodeURIComponent(`PCGS OR NGC cert ${barcode}`);
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return null;

    const url = `https://serpapi.com/search.json?q=${q}&api_key=${apiKey}`;
    const response = await axios.get(url);
    const results = response.data.organic_results || [];
    
    if (results.length > 0) {
      const topResult = results[0];
      const title = topResult.title || '';
      const snippet = topResult.snippet || '';
      
      let agency = null;
      if (title.toUpperCase().includes('PCGS')) agency = 'PCGS';
      else if (title.toUpperCase().includes('NGC')) agency = 'NGC';
      else if (snippet.toUpperCase().includes('PCGS')) agency = 'PCGS';
      else if (snippet.toUpperCase().includes('NGC')) agency = 'NGC';
      
      if (agency) {
        let name = title.split('|')[0].replace(/PCGS Cert Verification.*/i, '').trim();
        if (name.length < 3) name = `Graded Coin (${barcode})`;
        
        // Try to extract condition from title/snippet
        const combinedText = (title + " " + snippet).toUpperCase();
        let condition = 'Unknown Condition';
        const match = combinedText.match(/\b(PO|FR|G|VG|F|VF|EF|XF|AU|MS|PR|PF)[\s-]?(\d{1,2})(?:\b|[A-Za-z]+)/i);
        if (match) {
          condition = `${match[1].toUpperCase()}-${match[2]}`;
        }

        return {
          name,
          description: snippet,
          imageUrl: topResult.thumbnail || null,
          coinGradingAgency: agency,
          coinCertNumber: barcode,
          coinCondition: condition
        };
      }
    }
  } catch (err) {
    console.error('fetchGradingAgencyBarcode error:', err.message);
  }
  return null;
}

async function fetchComicMarketValue(name, condition) {
  try {
    const isRaw = condition === 'Raw / Ungraded' || condition === 'Unknown Condition';
    const cleanCond = (condition && condition !== 'Unknown Condition' && condition !== 'Raw / Ungraded') ? `${condition} CGC CBCS` : 'loose raw comic';
    const q = encodeURIComponent(`${name} ${cleanCond} value price estimate`);
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return null;

    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${q}&api_key=${apiKey}`;
    const res = await axios.get(url);
    if (res.data && res.data.shopping_results && res.data.shopping_results.length > 0) {
      const prices = res.data.shopping_results
        .map(r => r.extracted_price)
        .filter(p => p && p > 0)
        .sort((a, b) => a - b);
      
      if (prices.length > 0) {
        return {
          valueLow: prices[0],
          valueAvg: parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
          valueHigh: prices[prices.length - 1]
        };
      }
    }
  } catch (err) {
    console.error('fetchComicMarketValue error:', err.message);
  }
  return null;
}

async function fetchCardMarketValue(name, condition) {
  try {
    const cleanCond = (condition && condition !== 'Raw (Ungraded)' && condition !== 'Unknown Condition') ? condition : '';
    const q = encodeURIComponent(`${name} ${cleanCond} value price estimate PSA BGS SGC`.replace(/\s+/g, ' ').trim());
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return null;

    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${q}&api_key=${apiKey}`;
    const res = await axios.get(url);

    if (res.data.shopping_results && res.data.shopping_results.length > 0) {
      let prices = res.data.shopping_results
        .map(r => r.extracted_price)
        .filter(p => p !== undefined && p !== null && typeof p === 'number' && p > 0)
        .sort((a, b) => a - b);

      if (prices.length > 0) {
        if (prices.length >= 4) {
          const trimCount = Math.max(1, Math.floor(prices.length * 0.1));
          prices = prices.slice(trimCount, prices.length - trimCount);
        }
        
        const sum = prices.reduce((acc, p) => acc + p, 0);
        const avg = sum / prices.length;
        return {
          valueLow: Number(prices[0].toFixed(2)),
          valueAvg: Number(avg.toFixed(2)),
          valueHigh: Number(prices[prices.length - 1].toFixed(2))
        };
      }
    }
  } catch (err) {
    console.error('fetchCardMarketValue error:', err.message);
  }
  return null;
}

async function fetchCardGradingAgencyBarcode(barcode) {
  try {
    const q = encodeURIComponent(`PSA OR BGS OR SGC cert ${barcode}`);
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return null;

    const url = `https://serpapi.com/search.json?q=${q}&api_key=${apiKey}`;
    const response = await axios.get(url);
    const results = response.data.organic_results || [];
    
    if (results.length > 0) {
      const topResult = results[0];
      const title = topResult.title || '';
      const snippet = topResult.snippet || '';
      
      let agency = null;
      if (title.toUpperCase().includes('PSA') || snippet.toUpperCase().includes('PSA')) agency = 'PSA';
      else if (title.toUpperCase().includes('BGS') || snippet.toUpperCase().includes('BGS') || title.toUpperCase().includes('BECKETT')) agency = 'BGS';
      else if (title.toUpperCase().includes('SGC') || snippet.toUpperCase().includes('SGC')) agency = 'SGC';
      else if (title.toUpperCase().includes('CGC') || snippet.toUpperCase().includes('CGC')) agency = 'CGC';
      
      if (agency) {
        let name = title.split('|')[0].replace(/(PSA|BGS|SGC) Cert Verification.*/i, '').trim();
        if (name.length < 3) name = `Graded Card (${barcode})`;
        
        const combinedText = (title + " " + snippet).toUpperCase();
        let condition = 'Unknown Condition';
        const match = combinedText.match(/\b(MINT|GEM MINT|PRISTINE|NM-MT|NM|EX-MT|EX|VG-EX|VG|GOOD|POOR|GEM|MT|NM\/MT)[\s-]?(\d{1,2}(?:\.5)?)?\b/i);
        if (match) {
          condition = `${match[1].toUpperCase()}${match[2] ? ' ' + match[2] : ''}`;
        }

        return {
          name,
          description: snippet,
          imageUrl: topResult.thumbnail || null,
          cardGradingAgency: agency,
          cardCertNumber: barcode,
          cardCondition: condition
        };
      }
    }
  } catch (err) {
    console.error('fetchCardGradingAgencyBarcode error:', err.message);
  }
  return null;
}

async function fetchCardMetadataFromImage(imagePath, isPremium) {
  const visionDetails = await fetchGoogleVision(imagePath);
  let name = 'Trading Card';
  let agency = null;
  let condition = 'Unknown Condition';
  let certNumber = null;
  let description = '';

  if (visionDetails && visionDetails.description) {
    const text = visionDetails.description.replace('Detected Text:', '');
    description = visionDetails.description;
    
    if (/\bPSA\b/i.test(text)) agency = 'PSA';
    else if (/\bBGS\b/i.test(text) || /\bBECKETT\b/i.test(text)) agency = 'BGS';
    else if (/\bSGC\b/i.test(text)) agency = 'SGC';
    else if (/\bCGC\b/i.test(text)) agency = 'CGC';

    const conditionMatch = text.match(/\b(MINT|GEM MINT|PRISTINE|NM-MT|NM|EX-MT|EX|VG-EX|VG|GOOD|POOR|GEM|MT|NM\/MT)[\s-]+(\d{1,2}(?:\.5)?)?\b/i);
    if (conditionMatch) {
      condition = `${conditionMatch[1].toUpperCase()}${conditionMatch[2] ? ' ' + conditionMatch[2] : ''}`;
    }

    const certMatch = text.match(/\b\d{7,10}\b/);
    if (certMatch) {
      certNumber = certMatch[0];
      if (!agency) {
        if (certNumber.length === 8) agency = 'PSA';
        else if (certNumber.length === 10) agency = 'BGS';
        else if (certNumber.length === 7) agency = 'SGC';
      }
    }

    let cleanText = text;
    const dtMatch = text.match(/Detected Text:\s*(.+)/i);
    if (dtMatch) cleanText = dtMatch[1].split(/Tags:/i)[0]; // strip tags

    const parts = cleanText.split(/[\n-]/)
      .map(p => p.trim())
      .filter(p => p.length >= 3 && !/PSA|BGS|SGC|CGC|MINT|GEM|\b\d{7,10}\b/i.test(p) && !p.toLowerCase().includes('identified via') && !p.toLowerCase().includes('brands/logos'));
    
    if (parts.length > 0) name = parts.slice(0, 3).join(' - ').trim();
  }

  if (isPremium) {
    const lensDetails = await fetchSerpApiGoogleLens(imagePath);
    if (lensDetails && lensDetails.name && lensDetails.name.toLowerCase() !== 'unknown item (needs review)') {
      name = lensDetails.name;
      if (lensDetails.description) description = lensDetails.description + '\n\n' + description;
    }
  }

  return {
    name,
    description,
    cardGradingAgency: agency,
    cardCondition: condition !== 'Unknown Condition' ? condition : 'Raw (Ungraded)',
    cardCertNumber: certNumber
  };
}

async function fetchComicMetadataFromImage(imagePath) {
  const visionDetails = await fetchGoogleVision(imagePath);
  let name = 'Comic Book';
  let agency = null;
  let condition = 'Raw / Ungraded';
  let certNumber = null;
  let description = '';
  
  // Lens is critical for Comics
  const lensDetails = await fetchSerpApiGoogleLens(imagePath);
  let publisher = 'Unknown';
  let issue = 'N/A';

  if (visionDetails && visionDetails.description) {
    const text = visionDetails.description.replace('Detected Text:', '');
    description = visionDetails.description;
    
    if (/\bCGC\b/i.test(text)) agency = 'CGC';
    else if (/\bCBCS\b/i.test(text)) agency = 'CBCS';
    else if (/\bPGX\b/i.test(text)) agency = 'PGX';

    // Matches CGC format e.g., 9.8, 9.6, 9.4
    const conditionMatch = text.match(/\b(10|9\.[0-9]|[1-8]\.[0-9]|[0-9]\.[0-9])\b/);
    if (conditionMatch && agency) {
      condition = conditionMatch[1];
    }

    // Cert number usually 10-14 digits or CGC format
    const certMatch = text.match(/\b\d{9,14}\b/);
    if (certMatch) {
      certNumber = certMatch[0];
    }
  }

  if (lensDetails && lensDetails.name && lensDetails.name.toLowerCase() !== 'unknown item (needs review)') {
    name = lensDetails.name;
    if (lensDetails.description) description = lensDetails.description + '\n\n' + description;
    
    // Guess Publisher from name or text
    const lowerName = name.toLowerCase();
    if (lowerName.includes('marvel')) publisher = 'Marvel Comics';
    else if (lowerName.includes('dc ') || lowerName.includes('batman') || lowerName.includes('superman')) publisher = 'DC Comics';
    else if (lowerName.includes('image')) publisher = 'Image Comics';
    else if (lowerName.includes('dark horse')) publisher = 'Dark Horse';
    
    // Extract Issue Number
    const issueMatch = name.match(/#(\d+)/) || name.match(/\b(vol\.?\s*\d*|issue\s*#?)\s*(\d+)/i) || name.match(/(?<!\d)(?:No\.?|Issue)?\s*(\d+)(?!\d)/i);
    if (issueMatch) {
      issue = issueMatch[issueMatch.length - 1]; // get the matched number
    }
  }

  return { 
    name, 
    description, 
    comicGradingAgency: agency, 
    comicCondition: condition, 
    comicCertNumber: certNumber,
    comicPublisher: publisher,
    comicIssue: issue
  };
}

async function fetchNumistaCoin(imagePath, imagePathBack = null) {
  const numistaKey = process.env.NUMISTA_API_KEY;
  if (!numistaKey) {
    console.warn('[Worker] Numista Coin scan requested but no API key (NUMISTA_API_KEY) in .env.local');
    return await fetchGoogleVision(imagePath);
  }

  try {
    // 1. Get OCR text from Google Vision for FRONT
    const visionFront = await fetchGoogleVision(imagePath);
    
    // 2. Get OCR text for BACK (if it exists)
    let visionBack = null;
    if (imagePathBack) {
      visionBack = await fetchGoogleVision(imagePathBack);
    }

    if (!visionFront && !visionBack) return null;
    
    let coinGradingAgency = null;
    let coinCondition = null;
    let coinCertNumber = null;

    if (visionFront && visionFront.description) {
      const text = visionFront.description;
      if (/\bPCGS\b/i.test(text)) coinGradingAgency = 'PCGS';
      else if (/\bNGC\b/i.test(text)) coinGradingAgency = 'NGC';
      else if (/\bANACS\b/i.test(text)) coinGradingAgency = 'ANACS';
      else if (/\bICG\b/i.test(text)) coinGradingAgency = 'ICG';
      
      const condMatch = text.match(/\b(MS|PR|PF|AU|XF|EF|VF|F|VG|G|AG|FA|PO|SP)[\s-]*(\d{1,2})(?:\b|[A-Za-z]+)/i);
      if (condMatch) {
        coinCondition = `${condMatch[1].toUpperCase()} ${condMatch[2]}`;
      }
      
      const ngcMatch = text.match(/\b\d{6,8}-\d{3}\b/);
      if (ngcMatch) {
        coinCertNumber = ngcMatch[0];
        if (!coinGradingAgency) coinGradingAgency = 'NGC';
      } else {
        const pcgsMatch = text.match(/\b\d{7,8}\b/);
        if (pcgsMatch) {
          coinCertNumber = pcgsMatch[0];
        }
      }
    }

    // Extract the raw detected text
    let queryParts = [];
    
    if (visionFront) {
      const match1 = visionFront.description.match(/Detected Text:\s*(.+)/);
      let rawText = match1 ? match1[1].split(/Tags:/i)[0] : '';
      let cleanText = rawText.replace(/[/.]/g, ' ')
                             .replace(/PCGS|NGC|ANACS|ICG/gi, '')
                             .replace(/\b(PO|FR|G|VG|F|VF|EF|XF|AU|MS|PR|PF)[\s-]*\d{1,2}(?:\b|[A-Za-z]+)/gi, '')
                             .replace(/\b(?:FIRST STRIKE|IN GOD WE TRUST|INGOD WE TRUST|E PLURIBUS UNUM|EARLY RELEASES|FIRST RELEASES|GEM UNCIRCULATED|BRILLIANT UNCIRCULATED|PROOF|MINT STATE)\b/gi, '')
                             .replace(/\b\d{5,10}\b/g, '')
                             .replace(/\b(?:Series|Coin|Set|LIB)\s*:?\s*\w*/gi, '')
                             .replace(/\b(?:6[0-9]|70)\b/g, '')
                             .replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
                             
      if (cleanText.length > 3) queryParts.push(cleanText);
      
      if (visionFront.name && visionFront.name.toLowerCase() !== 'unknown item (needs review)') {
        queryParts.push(visionFront.name);
      }
    }

    if (visionBack) {
      const match2 = visionBack.description.match(/Detected Text:\s*(.+)/);
      let rawText = match2 ? match2[1].split(/Tags:/i)[0] : '';
      let cleanText = rawText.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (cleanText.length > 3) queryParts.push(cleanText);
      
      if (visionBack.name && visionBack.name.toLowerCase() !== 'unknown item (needs review)') {
        queryParts.push(visionBack.name);
      }
    }

    const query = queryParts.join(' ').trim();

    if (queryParts.length === 0) {
      return visionFront || visionBack; // Nothing to search
    }

    // 2. Query Numista Free Catalogue Search
    let queriesToTry = [ queryParts.join(' ').trim() ];
    if (queryParts.length > 1) {
      queriesToTry.push(queryParts[0]); // try just the clean slab text without Google's name guess
      queriesToTry.push(queryParts[1]); // try just Google's name guess
    }

    for (const q of queriesToTry) {
      if (!q || q.length < 3) continue;
      console.log(`[Worker] Querying Numista with text: ${q}`);
      try {
        const res = await axios.get(`https://api.numista.com/api/v3/types`, {
          params: { q },
          headers: { 'Numista-API-Key': numistaKey },
          timeout: 10000
        });

        if (res.data && res.data.types && res.data.types.length > 0) {
          // Keep digits (like years) in qWords because they are important!
          const qWords = q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
          let best = res.data.types[0];
          
          if (qWords.length > 0) {
            const betterMatch = res.data.types.find(t => {
              const titleLower = t.title.toLowerCase();
              
              // Find years in the query
              const queryYears = (q.match(/\b(17|18|19|20)\d{2}\b/g) || []);
              
              let yearMatches = false;
              if (queryYears.length > 0) {
                 yearMatches = queryYears.some(y => 
                   titleLower.includes(y) || 
                   (t.min_year && parseInt(y) >= t.min_year && parseInt(y) <= t.max_year)
                 );
              }

              // Check text overlap (ignore purely numeric words for this check)
              const textWords = qWords.filter(w => !/^\d+$/.test(w));
              const matchedTextWords = textWords.filter(w => titleLower.includes(w));
              
              // Numista parses "10C" to "10 Cents". If "10C" is the only text word, we're in trouble unless the year matches.
              if (yearMatches) {
                 // If the year matched perfectly to the database or title, we trust Numista far more.
                 return true;
              }

              // Otherwise, require at least 2 text words to match
              return matchedTextWords.length >= Math.min(2, textWords.length) && textWords.length > 0;
            });
            
            if (betterMatch) {
              best = betterMatch;
            } else {
              console.log(`[Worker] Rejecting Numista result '${best.title}' because it lacks sufficient word overlap with '${q}'`);
              continue; // try next query
            }
          }

          return {
            name: best.title + (q.includes('2004') && !best.title.includes('2004') ? ' 2004' : ''),
            description: `[Identified via Numista API]\n\nIssuer: ${best.issuer?.name || 'Unknown'}\nYears: ${best.min_year} - ${best.max_year}\nReference: ${best.reference || 'N/A'}`,
            coinGradingAgency,
            coinCondition,
            coinCertNumber
          };
        }
      } catch (e) {
        console.error('Numista search error for query', q, e.message);
      }
    }

    console.log('[Worker] Numista returned no valid results. Falling back to raw OCR.');
    
    // For graded slabs, the cleaned slab text is vastly superior to Google Vision's entity guesses
    let fallbackName = queryParts[0];
    if (!fallbackName || fallbackName.length < 3) {
      fallbackName = visionFront?.name || 'Unknown Coin';
    }

    if (visionFront) {
      return {
        name: fallbackName,
        description: visionFront.description,
        coinGradingAgency,
        coinCondition,
        coinCertNumber
      };
    }
    return visionBack;
  } catch (e) {
    console.error('Numista API error:', e.message);
    return await fetchGoogleVision(imagePath);
  }
}

async function fetchUPCItemDB(upc) {
  try {
    const res = await axios.get(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`, { timeout: 4000 });
    if (res.data && res.data.items && res.data.items.length > 0) {
      const item = res.data.items[0];
      return {
        name: cleanTitle(item.title) || null,
        imageUrl: (item.images && item.images.length > 0) ? item.images[0] : null,
        description: item.description || null,
        category: item.category || null
      };
    }
  } catch (e) {
    // Check if it's a rate limit
    if (e.response && e.response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    console.error('UPCItemDB API error:', e.message);
  }
  return null;
}

async function fetchPriceCharting(upc) {
  const token = process.env.PRICECHARTING_KEY;
  
  // Sandbox / Demo Mode fallback if no key is configured
  if (!token) {
    console.log(`[Worker] PriceCharting API token not configured. Checking Sandbox fallbacks for UPC: ${upc}`);
    const sandboxData = {
      '045496830021': {
        productName: 'Super Mario World',
        consoleName: 'Super Nintendo',
        loosePrice: 20.50,
        completePrice: 45.00,
        newPrice: 150.00,
        gradedPrice: 450.00
      },
      '045496961480': {
        productName: 'Mario Kart 64',
        consoleName: 'Nintendo 64',
        loosePrice: 40.00,
        completePrice: 85.00,
        newPrice: 250.00,
        gradedPrice: 750.00
      },
      '010086010077': {
        productName: 'Sonic the Hedgehog',
        consoleName: 'Sega Genesis',
        loosePrice: 15.00,
        completePrice: 35.00,
        newPrice: 100.00,
        gradedPrice: 300.00
      },
      '045496830403': {
        productName: 'Super Metroid',
        consoleName: 'Super Nintendo',
        loosePrice: 75.00,
        completePrice: 220.00,
        newPrice: 650.00,
        gradedPrice: 1800.00
      }
    };

    if (sandboxData[upc]) {
      const p = sandboxData[upc];
      console.log(`[Worker] Sandbox Match! Returning demo metadata for ${p.productName}`);
      return {
        name: `${p.productName} (${p.consoleName})`,
        description: `[Simulated via PriceCharting Sandbox Mode]\n\nConsole: ${p.consoleName}\nLoose: $${p.loosePrice}\nCIB: $${p.completePrice}\nNew: $${p.newPrice}\nGraded: $${p.gradedPrice}`,
        valueLow: p.loosePrice,
        valueAvg: p.completePrice,
        valueHigh: p.newPrice,
        itemType: 'game'
      };
    }
    
    console.warn('[Worker] PriceCharting API token not configured and no Sandbox match. Skipping lookup.');
    return null;
  }

  try {
    console.log(`[Worker] Querying PriceCharting API for UPC: ${upc}`);
    const res = await axios.get('https://www.pricecharting.com/api/product', {
      params: {
        t: token,
        upc: upc
      },
      timeout: 5000
    });

    if (res.data && res.data.status === 'success') {
      const p = res.data;
      const valueLow = p['loose-price'] || null;
      const valueAvg = p['complete-price'] || null;
      const valueHigh = p['new-price'] || null;
      const consoleName = p['console-name'] || '';
      const prodName = p['product-name'] || '';
      const name = consoleName ? `${prodName} (${consoleName})` : prodName;

      return {
        name: name || null,
        description: `[Identified via PriceCharting API]\n\nConsole: ${consoleName}\nLoose Price: $${valueLow || 'N/A'}\nCIB Price: $${valueAvg || 'N/A'}\nNew Price: $${valueHigh || 'N/A'}\nGraded Price: $${p['graded-price'] || 'N/A'}`,
        valueLow,
        valueAvg,
        valueHigh,
        itemType: 'game'
      };
    }
  } catch (e) {
    console.error('PriceCharting API error:', e.message);
  }
  return null;
}

async function fetchOpenFoodFacts(barcode) {
  try {
    const res = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, { timeout: 4000 });
    if (res.data && res.data.product) {
      return {
        name: cleanTitle(res.data.product.product_name) || null,
        imageUrl: res.data.product.image_url || res.data.product.image_front_url || null,
        description: res.data.product.ingredients_text || res.data.product.generic_name || null
      };
    }
  } catch (e) {
    console.error('OpenFoodFacts API error:', e.message);
  }
  return null;
}
async function fetchGradedMarketValue(name, agency, condition) {
  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey || !name) return null;

  try {
    const cleanCond = (condition && condition !== 'Unknown Condition') ? condition : '';
    const query = encodeURIComponent(`${name} ${agency || ''} ${cleanCond}`.trim().replace(/\s+/g, ' '));
    const res = await axios.get(`https://serpapi.com/search.json?engine=google_shopping&q=${query}&api_key=${serpApiKey}`, { timeout: 10005 });
    
    if (res.data && res.data.shopping_results && res.data.shopping_results.length > 0) {
      let prices = res.data.shopping_results
        .map(r => r.extracted_price)
        .filter(p => p !== undefined && p > 0);
        
      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        let low = prices[0];
        let high = prices[prices.length - 1];
        let avg = prices.reduce((a, b) => a + b, 0) / prices.length;

        // filter outliers
        if (prices.length >= 3) {
          const midPrices = prices.slice(1, -1);
          avg = midPrices.reduce((a, b) => a + b, 0) / midPrices.length;
        }

        return {
          valueLow: parseFloat(low.toFixed(2)),
          valueAvg: parseFloat(avg.toFixed(2)),
          valueHigh: parseFloat(high.toFixed(2))
        };
      }
    }
  } catch (e) {
    console.error('Graded Market Value search error:', e.message);
  }
  return null;
}

async function fetchGradedAssetFromImage(imagePath, isPremium) {
  const visionDetails = await fetchGoogleVision(imagePath);
  let name = 'Graded Item';
  let agency = null;
  let condition = 'Unknown Condition';
  let certNumber = null;
  let description = '';

  if (visionDetails && visionDetails.description) {
    const text = visionDetails.description.replace('Detected Text:', '');
    description = visionDetails.description;
    
    if (/\bWATA\b/i.test(text)) agency = 'WATA';
    else if (/\bVGA\b/i.test(text)) agency = 'VGA';
    else if (/\bPSA\b/i.test(text)) agency = 'PSA';
    else if (/\bBGS\b/i.test(text) || /\bBECKETT\b/i.test(text)) agency = 'BGS';
    else if (/\bSGC\b/i.test(text)) agency = 'SGC';
    else if (/\bCGC\b/i.test(text)) agency = 'CGC';
    else if (/\bPCGS\b/i.test(text)) agency = 'PCGS';
    else if (/\bNGC\b/i.test(text)) agency = 'NGC';
    else if (/\bUKG\b/i.test(text)) agency = 'UKG';
    else if (/\bCBCS\b/i.test(text)) agency = 'CBCS';

    // Matches numbers like 9.8, 85, 85+, 90, 9.5, MS-65, VF, NM etc.
    const conditionMatch = text.match(/\b(A\+\+|A\+|A|B\+|B|C|MINT|GEM MINT|PRISTINE|NM-MT|NM|EX-MT|EX|VG-EX|VG|GOOD|POOR|GEM|MT|MS-?\d{1,2}|PR-?\d{1,2}|VF|FN)[\s-]+(\d{1,3}(?:\.\d)?\+?)?\b|\b(\d{1,3}(?:\.\d)?\+?)\b/i);
    
    if (conditionMatch) {
      if (conditionMatch[1]) {
         condition = `${conditionMatch[1].toUpperCase()}${conditionMatch[2] ? ' ' + conditionMatch[2] : ''}`;
      } else if (conditionMatch[3]) {
         condition = conditionMatch[3];
      }
    }

    const certMatch = text.match(/\b\d{7,14}\b/);
    if (certMatch) certNumber = certMatch[0];

    let cleanText = text;
    const dtMatch = text.match(/Detected Text:\s*(.+)/i);
    if (dtMatch) cleanText = dtMatch[1].split(/Tags:/i)[0]; // strip tags

    const ignoreKeywords = /WATA|VGA|PSA|BGS|SGC|CGC|PCGS|NGC|CBCS|UKG|MINT|GEM|\b\d{7,14}\b/i;
    const parts = cleanText.split(/[\n-]/)
      .map(p => p.trim())
      .filter(p => p.length >= 3 && !ignoreKeywords.test(p) && !p.toLowerCase().includes('identified via') && !p.toLowerCase().includes('brands/logos'));
    
    if (parts.length > 0) name = parts.slice(0, 3).join(' - ').trim();
  }

  if (isPremium) {
    const lensDetails = await fetchSerpApiGoogleLens(imagePath);
    if (lensDetails && lensDetails.name && lensDetails.name.toLowerCase() !== 'unknown item (needs review)') {
      name = lensDetails.name;
      if (lensDetails.description) description = lensDetails.description + '\n\n' + description;
    }
  }

  return { name, description, gradedAgency: agency, gradedCondition: condition, gradedCertNumber: certNumber };
}

export async function fetchItemDetails(item, db, options = {}) {
  const barcode = item.barcode;
  let details = null;
  let rateLimited = false;

  console.log(`[Worker] Fetching metadata for item: ${item.id} (Barcode: ${barcode})`);

  const originalSerpApiKey = process.env.SERPAPI_KEY;
  if (options.refreshPrices) {
    process.env.SERPAPI_KEY = '';
  }

  try {
    try {
    // Determine the active tier preference from the global settings
    let isPremium = false;
    try {
      const globalDb = await getGlobalDb();
      const tierRow = globalDb.prepare("SELECT value FROM system_settings WHERE key = 'active_tier'").get();
      if (tierRow && tierRow.value === 'premium') {
        isPremium = true;
      }
    } catch (e) {
      // ignore
    }
      
    if (options.refreshPrices) {
      details = {
        name: item.name,
        description: item.description,
        itemType: item.itemType,
        imageUrl: item.imagePath
      };
    } else if (options.forceTier) {
      if (options.forceTier === 'market_value_only') {
        details = {
          name: item.name,
          description: item.description,
          itemType: item.itemType,
          imageUrl: item.imagePath
        };
      } else if (options.forceTier === 'premium' && item.imagePath) {
        details = await fetchSerpApiGoogleLens(item.imagePath);
      } else if (options.forceTier === 'basic' && item.imagePath) {
        details = await fetchGoogleVision(item.imagePath);
      } else if (options.forceTier === 'coin') {
        if (item.imagePath) {
          details = await fetchNumistaCoin(item.imagePath, item.imagePathBack);
        } else if (barcode) {
          details = await fetchGradingAgencyBarcode(barcode);
        }
      } else if (options.forceTier === 'toy' && item.imagePath) {
        details = await fetchSerpApiGoogleLens(item.imagePath);
      } else if (options.forceTier === 'video' && item.imagePath) {
        details = await fetchSerpApiGoogleLens(item.imagePath);
      } else if (options.forceTier === 'game') {
        if (item.imagePath) {
          details = await fetchSerpApiGoogleLens(item.imagePath);
        } else if (barcode) {
          details = await fetchPriceCharting(barcode);
        }
      } else if (options.forceTier === 'comic' && item.imagePath) {
        details = await fetchComicMetadataFromImage(item.imagePath);
      } else if (options.forceTier === 'card') {
        if (item.imagePath) {
          details = await fetchCardMetadataFromImage(item.imagePath, true);
        } else if (barcode) {
          details = await fetchCardGradingAgencyBarcode(barcode);
        }
      } else if (options.forceTier === 'graded') {
        if (item.imagePath) {
          details = await fetchGradedAssetFromImage(item.imagePath, true);
        }
      }
    } else {
      // Automatic background processing upon import/sync
      // "If overall set to basic then use nothing but basic automatically upon import.
      //  if overall set to premium then use nothing but premium."
      if (item.imagePath) {
        if (isPremium) {
          console.log(`[Worker] Automatic import (Premium): Running Google Lens search on ${item.imagePath}`);
          details = await fetchSerpApiGoogleLens(item.imagePath);
        } else {
          console.log(`[Worker] Automatic import (Basic): Running Google Vision search on ${item.imagePath}`);
          details = await fetchGoogleVision(item.imagePath);
        }
      } else if (barcode) {
        // If there's no photo but a barcode, run standard barcode lookup
        if (item.itemType === 'coin') {
          details = await fetchGradingAgencyBarcode(barcode);
        } else if (item.itemType === 'card') {
          details = await fetchCardGradingAgencyBarcode(barcode);
        } else if (!(barcode.startsWith('2') || barcode.length < 10 || barcode.length > 14)) {
          if (barcode.length >= 10 && (barcode.startsWith('978') || barcode.startsWith('979') || barcode.length === 10)) {
            try {
              details = await fetchGoogleBooks(barcode);
            } catch (err) {
              if (err.message === 'RATE_LIMIT') rateLimited = true;
            }
          }
          if (!details && !rateLimited) {
            try {
              details = await fetchUPCItemDB(barcode);
              
              if (details) {
                // Waterfall check: is this a video game category?
                const cat = details.category ? details.category.toLowerCase() : '';
                const isGame = cat.includes('video game') || 
                           cat.includes('game console') || 
                           cat.includes('consoles >') || 
                           cat.includes('software > games') ||
                           cat.includes('toys & games > games > video games');
                
                if (isGame) {
                  console.log(`[Worker] Detected Video Game category "${details.category}" from UPCItemDB. Triggering PriceCharting Waterfall.`);
                  const pcDetails = await fetchPriceCharting(barcode);
                  if (pcDetails) {
                    details = pcDetails;
                  }
                }
              } else {
                // Secondary fallback: if UPCItemDB returned nothing, query PriceCharting anyway in case it's a game not in UPCItemDB
                console.log(`[Worker] UPCItemDB returned no results for barcode ${barcode}. Trying PriceCharting fallback.`);
                const pcDetails = await fetchPriceCharting(barcode);
                if (pcDetails) {
                  details = pcDetails;
                }
              }
            } catch (err) {
              if (err.message === 'RATE_LIMIT') rateLimited = true;
            }
          }
          if (!details && !rateLimited) {
            details = await fetchOpenFoodFacts(barcode);
          }
        }
      }
    }

    // Ensure we have OCR text for games so the grading parser works even if Lens was used
    if (!options.refreshPrices && details && item.imagePath && (item.itemType === 'game' || options.forceTier === 'game') && (!details.description || !details.description.includes('Detected Text:'))) {
      const ocr = await fetchGoogleVision(item.imagePath);
      if (ocr && ocr.description) {
        details.description = (details.description || '') + '\n\n' + ocr.description;
      }
    }

    if (rateLimited) {
      db.prepare("UPDATE items SET syncStatus = 'rate_limited', lastSyncAttempt = ? WHERE id = ?").run(Date.now(), item.id);
      return { success: false, reason: 'rate_limited' };
    }

    const newStatus = details ? 'success' : 'failed';
    let name = (details && details.name) ? details.name : (item.name || 'Unknown Item');
    const imagePath = (details && details.imageUrl) ? details.imageUrl : item.imagePath;
    const description = (details && details.description) ? details.description : item.description;
    let itemType = (details && details.itemType) ? details.itemType : item.itemType;

    // Auto-classify standard items as video if category keywords suggest it's a movie/DVD
    if (details && details.category && itemType === 'standard') {
      const cat = details.category.toLowerCase();
      if (cat.includes('movies & tv') || cat.includes('dvd') || cat.includes('blu-ray') || cat.includes('vhs') || cat.includes('media > movies')) {
        console.log(`[Worker] Auto-classified item "${name}" as Video/Movie based on category: ${details.category}`);
        itemType = 'video';
      }
    }

    let moviePlot = item.moviePlot || null;
    let movieCast = item.movieCast || null;
    let movieTrailer = item.movieTrailer || null;

    let toyBrand = item.toyBrand || null;
    let toyYear = item.toyYear || null;
    let toyCondition = item.toyCondition || null;
    let valueLow = (details && details.valueLow !== undefined && details.valueLow !== null) ? details.valueLow : (item.valueLow || null);
    let valueAvg = (details && details.valueAvg !== undefined && details.valueAvg !== null) ? details.valueAvg : (item.valueAvg || null);
    let valueHigh = (details && details.valueHigh !== undefined && details.valueHigh !== null) ? details.valueHigh : (item.valueHigh || null);

    if (options.forceTier === 'market_value_only') {
      valueLow = null;
      valueAvg = null;
      valueHigh = null;
    }

    let coinCondition = item.coinCondition || null;
    let coinCertNumber = item.coinCertNumber || null;
    let coinGradingAgency = item.coinGradingAgency || null;

    let cardCondition = item.cardCondition || null;
    let cardCertNumber = item.cardCertNumber || null;
    let cardGradingAgency = item.cardGradingAgency || null;

    let comicCondition = item.comicCondition || null;
    let comicCertNumber = item.comicCertNumber || null;
    let comicGradingAgency = item.comicGradingAgency || null;
    let comicPublisher = item.comicPublisher || null;
    let comicIssue = item.comicIssue || null;

    let gradedCondition = item.gradedCondition || null;
    let gradedCertNumber = item.gradedCertNumber || null;
    let gradedAgency = item.gradedAgency || null;

    if ((itemType === 'video' || options.forceTier === 'video') && name && name !== 'Unknown Item') {
      let movieData = null;

      let tmdbApiKey = null;
      try {
        const keysRow = db.prepare("SELECT value FROM system_settings WHERE key = 'api_keys'").get();
        if (keysRow) {
          const keys = JSON.parse(keysRow.value);
          tmdbApiKey = keys.tmdbApiKey || null;
        }
      } catch (e) {
        // ignore
      }

      if (!options.refreshPrices && tmdbApiKey) {
        console.log(`[Worker] Querying TMDB for movie details: ${name}`);
        movieData = await fetchTMDBMovieMetadata(name, tmdbApiKey);
      }
      if (!options.refreshPrices && !movieData && process.env.SERPAPI_KEY) {
        console.log(`[Worker] Falling back to SerpApi for movie details: ${name}`);
        movieData = await fetchSerpApiMovieMetadata(name);
      }
      if (movieData) {
        moviePlot = movieData.moviePlot;
        movieCast = movieData.movieCast;
        movieTrailer = movieData.movieTrailer;
      }

      // Check if it's graded (Movies/VHS only)
      if (!options.refreshPrices && description) {
        if (/\bIGS\b/i.test(description)) gradedAgency = 'IGS';
        else if (/\bVGA\b/i.test(description)) gradedAgency = 'VGA'; // Some VHS are VGA
        
        if (gradedAgency) {
          const conditionMatch = description.match(/\b(A\+\+|A\+|A|B\+|B|C|MINT|GEM MINT|PRISTINE|NM-MT|NM|EX-MT|EX|VG-EX|VG|GOOD|POOR|GEM|MT|MS-?\d{1,2}|PR-?\d{1,2}|VF|FN)[\s-]+(\d{1,3}(?:\.\d)?\+?)?\b|\b(\d{1,3}(?:\.\d)?\+?)\b/i);
          if (conditionMatch) {
            if (conditionMatch[1]) {
               gradedCondition = `${conditionMatch[1].toUpperCase()}${conditionMatch[2] ? ' ' + conditionMatch[2] : ''}`;
            } else if (conditionMatch[3]) {
               gradedCondition = conditionMatch[3];
            }
          }
          
          const certMatch = description.match(/\b\d{7,14}\b/);
          if (certMatch) gradedCertNumber = certMatch[0];
        }
      }

      // Get Market Value
      if (gradedAgency && gradedCondition && (!valueAvg || options.refreshPrices)) {
        const marketData = await fetchGradedMarketValue(name, gradedAgency, gradedCondition);
        if (marketData) {
          valueLow = marketData.valueLow;
          valueAvg = marketData.valueAvg;
          valueHigh = marketData.valueHigh;
        }
      } else if (!valueAvg || options.refreshPrices) {
        const marketData = await fetchVideoMarketValue(name);
        if (marketData) {
          valueLow = marketData.valueLow;
          valueAvg = marketData.valueAvg;
          valueHigh = marketData.valueHigh;
        }
      }
    } else if ((itemType === 'game' || options.forceTier === 'game') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is a Video Game. Extracting grading and market value for: ${name}`);
      
      // Check if it's graded
      if (!options.refreshPrices && description) {
        let dtMatch = description.match(/Detected Text:\s*(.+)/i);
        let textToSearch = dtMatch ? dtMatch[1] : description;

        // Reset so Refetch doesn't carry over old hallucinated values
        gradedAgency = null;
        gradedCondition = null;
        gradedCertNumber = null;

        if (/\bWATA\b/i.test(textToSearch)) gradedAgency = 'WATA';
        else if (/\bVGA\b/i.test(textToSearch)) gradedAgency = 'VGA';
        else if (/\bCGC\b/i.test(textToSearch)) gradedAgency = 'CGC';
        else if (/\b(PSA|ESA)\b/i.test(textToSearch)) gradedAgency = 'PSA';
        
        if (gradedAgency) {
          const conditionMatch = textToSearch.match(/\b(A\+\+|A\+|A|B\+|B|C|MINT|GEM MINT|PRISTINE|NM-MT|NM|EX-MT|EX|VG-EX|VG|GOOD|POOR|GEM|MT|MS-?\d{1,2}|PR-?\d{1,2}|VF|FN)[\s-]+(\d{1,2}(?:\.\d)?\+?)?\b|\b(10(?:\.0)?|[0-9]\.\d|100|[1-9]\d\+?)\b/i);
          if (conditionMatch) {
            if (conditionMatch[1]) {
               gradedCondition = `${conditionMatch[1].toUpperCase()}${conditionMatch[2] ? ' ' + conditionMatch[2] : ''}`;
            } else if (conditionMatch[3]) {
               gradedCondition = conditionMatch[3];
            }
          }
          
          const certMatch = textToSearch.match(/\b\d{7,14}\b/);
          if (certMatch) gradedCertNumber = certMatch[0];

          // OVERRIDE HALLUCINATED NAMES WITH OCR TITLE
          if (dtMatch) {
            const cleanText = dtMatch[1].split(/Tags:/i)[0].trim();
            const parts = cleanText.split(' - ').map(p => p.trim()).filter(p => p.length > 0);
            let overrideName = null;
            
            if (gradedAgency === 'CGC') {
              const idx = parts.findIndex(p => /CGC (UNIVERSAL|QUALIFIED|SIGNATURE) GRADE/i.test(p));
              if (idx !== -1 && parts.length > idx + 2) {
                overrideName = parts[idx + 1] + ' ' + parts[idx + 2].replace(/, \d{4}$/, '');
              }
            } else if (gradedAgency === 'VGA') {
              const idx = parts.findIndex(p => /VGGRADER\.COM/i.test(p));
              if (idx !== -1 && parts.length > idx + 4) {
                const consolePart = parts[idx + 1].replace(/^\d{4}\s+[A-Z0-9-]+\s+/i, '');
                overrideName = parts[idx + 3] + ' ' + consolePart;
              }
            } else if (gradedAgency === 'WATA') {
              const idx = parts.findIndex(p => /WATA( GAMES)?/i.test(p));
              if (idx !== -1 && parts.length > idx + 2) {
                if (/^[\d\.]+$/.test(parts[idx + 1]) || /^(A\+\+|A\+|A|B\+|B|C)$/i.test(parts[idx + 1])) {
                   overrideName = parts[idx + 3] + ' ' + parts[idx + 4];
                } else {
                   overrideName = parts[idx + 1];
                }
              }
            } else if (gradedAgency === 'PSA') {
              const idx = parts.findIndex(p => /^(PSA|ESA)$/i.test(p));
              if (idx !== -1 && parts.length > idx + 2) {
                overrideName = parts[idx + 1] + ' ' + parts[idx + 2];
              }
            }
            
            if (overrideName && overrideName.length > 5 && !overrideName.match(/UNKNOWN/i)) {
              console.log(`[Worker] Overriding hallucinated title '${name}' with OCR title '${overrideName}'`);
              name = overrideName;
            }
          }
        }
      }

      // Get Market Value
      if (gradedAgency && gradedCondition && (!valueAvg || options.refreshPrices)) {
        const marketData = await fetchGradedMarketValue(name, gradedAgency, gradedCondition);
        if (marketData) {
          valueLow = marketData.valueLow;
          valueAvg = marketData.valueAvg;
          valueHigh = marketData.valueHigh;
        }
      } else if (!valueAvg || options.refreshPrices) {
        const marketData = await fetchVideoMarketValue(name);
        if (marketData) {
          valueLow = marketData.valueLow;
          valueAvg = marketData.valueAvg;
          valueHigh = marketData.valueHigh;
        }
      }
    } else if ((itemType === 'toy' || options.forceTier === 'toy') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is a Toy. Extracting details and calculating Market Value for: ${name}`);
      
      // 1. Extract Year and Brand
      if (!options.refreshPrices && !toyYear) {
        const yearMatch = name.match(/(19[7-9]\d|20[0-2]\d)/);
        if (yearMatch) toyYear = yearMatch[0];
      }
      if (!options.refreshPrices && !toyBrand) {
        const brands = ['Hasbro', 'Kenner', 'Mattel', 'Funko', 'NECA', 'Bandai', 'Lego', 'Playmates', 'Takara', 'McFarlane', 'Hot Toys', 'Mezco', 'Sideshow', 'Super7'];
        const brandMatch = brands.find(b => new RegExp('\\b' + b + '\\b', 'i').test(name));
        if (brandMatch) toyBrand = brandMatch;
      }

      // 2. Guess Condition (Only if not already set, and only if it's a photo scan!)
      if (!options.refreshPrices && !toyCondition) {
        if (barcode) {
          toyCondition = 'Unknown Condition';
        } else {
          const isBoxed = /(box|packaging|nib|mib)/i.test(name) || (details && details.description && /(box|packaging|nib|mib)/i.test(details.description));
          toyCondition = isBoxed ? 'Mint In Box' : 'Loose';
        }
      }

      // 3. Fetch Market Value
      if (toyCondition && (!valueAvg || options.refreshPrices)) {
        const marketData = await fetchToyMarketValue(name, toyCondition);
        if (marketData) {
          valueLow = marketData.valueLow;
          valueAvg = marketData.valueAvg;
          valueHigh = marketData.valueHigh;
        }
      }
    } else if ((itemType === 'coin' || options.forceTier === 'coin') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is a Coin. Extracting details and calculating Market Value for: ${name}`);
      
      if (!options.refreshPrices && details && details.coinGradingAgency) {
        coinGradingAgency = details.coinGradingAgency;
        coinCertNumber = details.coinCertNumber;
        if ((!coinCondition || coinCondition === 'Unknown Condition' || coinCondition === 'Ungraded') && details.coinCondition) {
          coinCondition = details.coinCondition;
        }
      }
      
      if (!options.refreshPrices && !coinCondition) {
        if (barcode) {
          coinCondition = 'Unknown Condition';
        } else {
          coinCondition = 'Ungraded';
        }
      }
      
      if (coinCondition && (!valueAvg || options.refreshPrices)) {
        const marketData = await fetchCoinMarketValue(name, coinCondition);
        if (marketData) {
          valueLow = marketData.valueLow;
          valueAvg = marketData.valueAvg;
          valueHigh = marketData.valueHigh;
        }
      }
    } else if ((itemType === 'card' || options.forceTier === 'card') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is a Card. Extracting details and calculating Market Value for: ${name}`);
      
      if (!options.refreshPrices && details && details.cardGradingAgency) {
        cardGradingAgency = details.cardGradingAgency;
        cardCertNumber = details.cardCertNumber;
        if ((!cardCondition || cardCondition === 'Unknown Condition' || cardCondition === 'Raw (Ungraded)') && details.cardCondition) {
          cardCondition = details.cardCondition;
        }
      }
      
      if (!options.refreshPrices && !cardCondition) {
        if (barcode) {
          cardCondition = 'Unknown Condition';
        } else {
          cardCondition = 'Raw (Ungraded)';
        }
      }
      
      if (cardCondition && (!valueAvg || options.refreshPrices)) {
        const marketData = await fetchCardMarketValue(name, cardCondition);
        if (marketData) {
          valueLow = marketData.valueLow;
          valueAvg = marketData.valueAvg;
          valueHigh = marketData.valueHigh;
        }
      }
    } else if ((itemType === 'graded' || options.forceTier === 'graded') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is a Graded Asset. Extracting details and calculating Market Value for: ${name}`);
      
      if (!options.refreshPrices && details && details.gradedAgency) {
        gradedAgency = details.gradedAgency;
        gradedCertNumber = details.gradedCertNumber;
        if ((!gradedCondition || gradedCondition === 'Unknown Condition') && details.gradedCondition) {
          gradedCondition = details.gradedCondition;
        }
      }
      
      if (gradedCondition && (!valueAvg || options.refreshPrices)) {
        const marketData = await fetchGradedMarketValue(name, gradedAgency, gradedCondition);
        if (marketData) {
          valueLow = marketData.valueLow;
          valueAvg = marketData.valueAvg;
          valueHigh = marketData.valueHigh;
        }
      }
    } else if ((itemType === 'comic' || options.forceTier === 'comic') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is a Comic. Extracting details and calculating Market Value for: ${name}`);
      
      if (!options.refreshPrices && details) {
        if (details.comicGradingAgency) comicGradingAgency = details.comicGradingAgency;
        if (details.comicCertNumber) comicCertNumber = details.comicCertNumber;
        if (details.comicCondition) comicCondition = details.comicCondition;
        if (details.comicPublisher) comicPublisher = details.comicPublisher;
        if (details.comicIssue) comicIssue = details.comicIssue;
      }
      
      if (!options.refreshPrices && !comicCondition) {
        comicCondition = 'Raw / Ungraded';
      }
      
      if (comicCondition && (!valueAvg || options.refreshPrices)) {
        const marketData = await fetchComicMarketValue(name, comicCondition);
        if (marketData) {
          valueLow = marketData.valueLow;
          valueAvg = marketData.valueAvg;
          valueHigh = marketData.valueHigh;
        }
      }
    }

    // Fallback: If no market value was fetched by the type-specific logic, try a generic lookup
    if (name && name !== 'Unknown Item' && (!valueAvg || options.refreshPrices)) {
      console.log(`[Worker] Falling back to generic market value search for: ${name}`);
      const marketData = await fetchGenericMarketValue(name);
      if (marketData) {
        valueLow = marketData.valueLow;
        valueAvg = marketData.valueAvg;
        valueHigh = marketData.valueHigh;
      }
    }

    db.prepare(`
      UPDATE items 
      SET name = ?, imagePath = ?, description = ?, syncStatus = ?, lastSyncAttempt = ?, 
          itemType = ?,
          moviePlot = ?, movieCast = ?, movieTrailer = ?, 
          toyBrand = ?, toyYear = ?, toyCondition = ?, 
          coinCondition = ?, coinCertNumber = ?, coinGradingAgency = ?, 
          cardCondition = ?, cardCertNumber = ?, cardGradingAgency = ?, 
          comicCondition = ?, comicCertNumber = ?, comicGradingAgency = ?, comicPublisher = ?, comicIssue = ?,
          gradedCondition = ?, gradedCertNumber = ?, gradedAgency = ?,
          valueLow = ?, valueAvg = ?, valueHigh = ?
      WHERE id = ?
    `).run(
      name, 
      imagePath, 
      description || '', 
      newStatus, 
      Date.now(),
      itemType,
      moviePlot,
      movieCast,
      movieTrailer,
      toyBrand,
      toyYear,
      toyCondition,
      coinCondition,
      coinCertNumber,
      coinGradingAgency,
      cardCondition,
      cardCertNumber,
      cardGradingAgency,
      comicCondition,
      comicCertNumber,
      comicGradingAgency,
      comicPublisher,
      comicIssue,
      gradedCondition,
      gradedCertNumber,
      gradedAgency,
      valueLow,
      valueAvg,
      valueHigh,
      item.id
    );

      return { success: !!details, details };
    } catch (err) {
      console.error(`[Worker] Unexpected error processing ${item.id}:`, err);
      db.prepare("UPDATE items SET syncStatus = 'failed', lastSyncAttempt = ? WHERE id = ?").run(Date.now(), item.id);
      return { success: false, reason: 'error' };
    }
  } finally {
    process.env.SERPAPI_KEY = originalSerpApiKey;
  }
}

async function processNextItem(userId = null) {
  const db = await getDb();
  
  // Try to find pending items specifically for the provided user, otherwise get any pending item
  let item;
  let isRefresh = false;

  if (userId) {
    item = db.prepare("SELECT * FROM items WHERE syncStatus = 'pending' AND userId = ? LIMIT 1").get(userId);
  }
  
  if (!item) {
    item = db.prepare("SELECT * FROM items WHERE syncStatus = 'pending' LIMIT 1").get();
  }

  // If no normal pending item, check for pending price refresh items
  if (!item) {
    if (userId) {
      item = db.prepare("SELECT * FROM items WHERE syncStatus = 'pending_price_refresh' AND userId = ? LIMIT 1").get(userId);
    }
    if (!item) {
      item = db.prepare("SELECT * FROM items WHERE syncStatus = 'pending_price_refresh' LIMIT 1").get();
    }
    if (item) {
      isRefresh = true;
    }
  }
  
  if (!item) {
    isWorking = false;
    return;
  }

  // --- GLOBAL API CONFIGURATION INJECTION ---
  try {
    const globalDb = await getGlobalDb();
    const keysRow = globalDb.prepare("SELECT value FROM system_settings WHERE key = 'api_keys'").get();
    if (keysRow) {
      const keys = JSON.parse(keysRow.value);
      if (keys.googleVisionKey) {
        process.env.GOOGLE_VISION_API_KEY = keys.googleVisionKey;
        process.env.GOOGLE_VISION_KEY = keys.googleVisionKey;
      }
      if (keys.serpApiKey) {
        process.env.SERPAPI_KEY = keys.serpApiKey;
      }
      if (keys.priceChartingKey) {
        process.env.PRICECHARTING_KEY = keys.priceChartingKey;
      }
      if (keys.googleCseKey) {
        process.env.GOOGLE_CSE_KEY = keys.googleCseKey;
      }
      if (keys.googleCseCx) {
        process.env.GOOGLE_CSE_CX = keys.googleCseCx;
      }
    }
  } catch (e) {
    console.error('Error injecting global API keys:', e);
  }
  // ------------------------------------------

  const result = await fetchItemDetails(item, db, isRefresh ? { refreshPrices: true } : {});

  if (result.reason === 'rate_limited') {
    console.log(`[Worker] RATE LIMIT hit. Marking remaining pending items as rate_limited.`);
    db.prepare("UPDATE items SET syncStatus = 'rate_limited', lastSyncAttempt = ? WHERE syncStatus = 'pending'").run(Date.now());
    db.prepare("UPDATE items SET syncStatus = 'rate_limited', lastSyncAttempt = ? WHERE syncStatus = 'pending_price_refresh'").run(Date.now());
    isWorking = false;
    return;
  }

  // Wait 12 seconds to respect the 6 requests/minute limit for UPCItemDB
  setTimeout(() => {
    processNextItem();
  }, 12000);
}

export function triggerWorker(userId = null) {
  if (!isWorking) {
    isWorking = true;
    // Process the first item immediately
    processNextItem(userId);
  }
}

// Global auto-resume timer (runs every 1 hour)
const autoResumeInterval = setInterval(async () => {
  const db = await getDb();
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  // Find items that were rate limited more than 24 hours ago
  const info = db.prepare("UPDATE items SET syncStatus = 'pending' WHERE syncStatus = 'rate_limited' AND lastSyncAttempt < ?").run(twentyFourHoursAgo);
  
  if (info.changes > 0) {
    console.log(`[Worker] Auto-resumed ${info.changes} rate-limited items after 24 hours.`);
    triggerWorker();
  }
}, 60 * 60 * 1000);

if (autoResumeInterval && typeof autoResumeInterval.unref === 'function') {
  autoResumeInterval.unref();
}
