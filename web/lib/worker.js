import axios from 'axios';
import { getDb, getGlobalDb } from './db.js';
import fs from 'fs/promises';
import path from 'path';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
} catch (e) {}

let isWorking = false;

// Helpers to fetch from various APIs
async function fetchGoogleBooks(isbn) {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_VISION_API_KEY || '';
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    const res = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${keyParam}`, { timeout: 4000 });
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
    console.warn('[Worker] Google Books API call failed:', e.message);
  }
  return null;
}

async function fetchOpenLibrary(isbn) {
  try {
    const res = await axios.get(`https://openlibrary.org/isbn/${isbn}.json`, { timeout: 4000 });
    if (res.data && res.data.title) {
      return {
        name: cleanTitle(res.data.title) || null,
        imageUrl: res.data.covers && res.data.covers.length > 0 ? `https://covers.openlibrary.org/b/id/${res.data.covers[0]}-L.jpg` : null,
        description: res.data.notes?.value || (typeof res.data.notes === 'string' ? res.data.notes : null) || null
      };
    }
  } catch (e) {
    console.warn('[Worker] OpenLibrary API call failed:', e.message);
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
      'art', 'arts', 'font', 'fonts', 'rectangle', 'rectangles', 'triangle', 'triangles', 'circle', 'circles', 'square', 'squares', 'oval', 'ovals', 'shape', 'shapes', 'meter', 'meters', 'video game', 'video games', 'game', 'games', 'electronics', 'gadget', 'gadgets', 'pc game', 'pc games', 'computer game', 'computer games',
      'toy', 'toys', 'box', 'boxes', 'cartridge', 'cartridges', 'text', 'texts', 'logo', 'logos', 'brand', 'brands', 'pattern', 'patterns', 'design', 'designs', 'illustration', 'illustrations', 'drawing', 'drawings', 'paper',
      'nintendo', 'nintendo entertainment system', 'nes', 'super nintendo', 'snes', 'playstation', 
      'playstation 2', 'playstation 3', 'playstation 4', 'ps2', 'ps3', 'ps4', 'xbox', 'xbox 360', 
      'wii', 'wii u', 'wiiu', 'nintendo ds', 'ds', 'nintendo 3ds', '3ds', 'psp', 'playstation portable', 'vita', 'playstation vita', 'switch', 'nintendo switch', 
      'windows', 'dos', 'ms-dos', 'cd-rom', 'cdrom', 'dvd-rom', 'dvdrom', 'floppy disc', 'floppy disk', 'diskette', 'software', 'pc cd', 'pc dvd', 'macintosh', 'mac', 
      'sega', 'genesis', 'konami', 'capcom', 'electronic arts', 'ea', 'sony', 'microsoft', 'ubisoft', 'activision', 'square enix', 'bandai', 'namco', 'bandai namco', 'thq', 'atari', 'midway', 'acclaim', 'snk', 'atlus', 'valve', 'mojang', 'rockstar', 'square', 'enix', 'hudson', 'lucasarts', 'bethesda', 'codemasters', 'bungie', 'koei', 'tecmo', 'koei tecmo',
      'tengen', 'rare', 'midway', 'williams', 'virgin', 'acclaim', 'ljn', 'sierra', 'infogrames', 'sunsoft', 'jaleco', 'data east', 'taito', 'kemco', 'tecmo', 'snk',
      'hand', 'finger', 'thumb', 'fingers', 'skin', 'nail', 'arm', 'person', 'h&m', 'money', 'currency', 'silver', 'gold', 'coin', 'coins', 'cash',
      'bottle', 'glass bottle', 'drink', 'beverage', 'can', 'soda can', 'water bottle', 'liquid', 'liqueur', 'liquor', 'alcohol', 'alcoholic drink', 'energy drink',
      'glass', 'metal', 'plastic', 'wood', 'ceramic', 'concrete', 'stone', 'cement', 'brick', 'floor', 'table', 'wall', 'counter', 'desk', 'background',
      'still life photography', 'still life', 'photography',
      'consumer', 'service', 'department', 'boulevard', 'blvd', 'avenue', 'parkway', 'suite', 'plaza', 'highway', 'hwy', 'office', 'offices', 'california', 'texas', 'incorporated', 'corp', 'corporation',
      'copyright', 'trademarks', 'registered trademark', 'registered trademarks', 'rights reserved', 'sega of america', 'printed in', 'assembled in', 'manufactured by', 'distributed by', 'customer service', 'consumer service', 'service center', 'corporate office', 'business office',
      'book cover', 'book covers', 'album cover', 'album covers', 'cd cover', 'cd covers', 'cover art', 'cover arts', 'movie poster', 'movie posters', 'poster', 'posters', 'advertising', 'magazine', 'magazines', 'comic book', 'comic books', 'novel', 'novels', 'graphic design', 'paper product', 'paper products',
      'dvd cover', 'dvd covers', 'vhs cover', 'vhs covers', 'screenshot', 'screenshots', 'case', 'cases', 'sleeve', 'sleeves', 'packaging', 'packagings', 'product', 'products', 'label', 'labels', 'signage', 'billboard', 'billboards', 'display', 'displays', 'graphics',
      'dvd', 'dvds', 'vhs', 'vhses', 'blu-ray', 'blu-rays', 'cd', 'cds', 'disc', 'discs', 'optical disc', 'optical discs', 'media', 'medias', 'movie', 'movies', 'film', 'films',
      'ntsc', 'pal', 'secam', 'uc', 'u/c', 'ntsc-u', 'ntsc-j',
      'esrb', 'pegi', 'cero', 'usk', 'everyone', 'teen', 'mature', 'adults only', 'rp',
      'content rated by', 'rated by', 'featuring the voice of', 'licensed by', 'official seal', 'made in', 'all rights reserved',
      'greatest hits', 'platinum hits', 'player\'s choice',
      'visual arts', 'performing arts', 'graphic arts', 'modern art', 'fine art', 'clip art', 'painting', 'paintings',
      'new', 'used', 'preowned', 'pre-owned',
      'fiction', 'fictional', 'fictional character', 'fictional characters', 'character', 'characters', 'jewel case', 'jewel cases',
      'online interactions', 'not rated', 'online int', 'contenu evalue', 'contenu', 'evalue', 'rating', 'ratings', 'adolescent', 'adolescents', 'no re', 'no rating',
      'evaluadas', 'evaluadas por', 'enfants et adultes', 'enfants', 'adultes', 'contert', 'contert gated by', 'gated by', 'das por esrs', 'das por esrb'
    ];

    const isGeneric = (str, exactOnly = false) => {
      if (!str) return true;
      const lowerStr = str.toLowerCase().trim();
      
      // Filter out non-Latin script names (e.g. Arabic, Cyrillic, Chinese) to fallback to English covers
      const latinRegex = /^[\u0000-\u024F\s\d.,;:#@!?"'()\[\]{}|&+=/\\~`-]*$/;
      if (!latinRegex.test(str)) return true;
      
      // 1. Filter out PlayStation/Nintendo/Sega serial and catalog codes (e.g. SLUS-01234, NUS-006, DOL-001, NES-GP-USA, T-12016)
      if (/\b[a-z]{3,4}[- ]?\d{3,5}\b/i.test(lowerStr)) return true;
      if (/\b(nes|dmg|cgb|agb)[- ][a-z]{2,4}(?:[- ][a-z]{3})?\b/i.test(lowerStr)) return true;
      if (/\bT[- ]?\d{4,6}\b/i.test(lowerStr)) return true;
      
      // 2. Filter out alphanumeric store codes (e.g. 040210VDM, 200749GOS)
      if (/^(?=[a-z]*\d)(?=\d*[a-z])[a-z\d]{5,}$/i.test(lowerStr)) return true;
      
      // 3. Filter out purely numeric tags that aren't typical years (e.g. 200749)
      if (/^\d+$/.test(lowerStr)) {
        const num = parseInt(lowerStr, 10);
        if (!(num >= 1980 && num <= 2030)) return true;
      }
      
      // 4. Filter out price tags (e.g. $59.99, $19)
      if (/\$\d+/.test(lowerStr)) return true;

      if (exactOnly) {
        return genericTerms.includes(lowerStr);
      }

      return genericTerms.some(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        return regex.test(lowerStr);
      });
    };

    // 1. Check for specific non-generic logos first (extremely high-precision brand matching)
    let logoName = null;
    if (response.logoAnnotations?.length > 0) {
      const validLogo = response.logoAnnotations.find(l => l.description && !isGeneric(l.description, true));
      if (validLogo) {
        logoName = validLogo.description;
      } else {
        logoName = response.logoAnnotations[0].description;
      }
    }

    // 2. Try to get title from OCR text (using logo index, logo space-stripped matching, or standard OCR lines)
    let ocrName = null;
    if (response.textAnnotations?.length > 0) {
      const lines = response.textAnnotations[0].description.split('\n')
        .map(l => {
          let cleaned = l.trim().replace(/-/g, ' ').replace(/\s+/g, ' ');
          // Remove region codes
          cleaned = cleaned.replace(/\b(ntsc|pal|secam|uc|u\/c|ntsc-u|ntsc-j)\b/ig, '');
          // Remove ratings and box boilerplate text
          cleaned = cleaned.replace(/\b(content rated by|content rated in|content rated|rated by esrb|rated by|rated|evaluadas|evaluadas por|enfants et adultes|enfants|adultes|contert|contert gated by|gated by|das por esrs|das por esrb|online interactions|not rated|online int|contenu evalue|contenu|evalue|rating|ratings|adolescent|adolescents|no re|no rating|esrb|pegi|cero|usk|everyone 10\+|everyone|kids to adults|ka|teen|mature|adults only|rp)\b/ig, '');
          cleaned = cleaned.replace(/\b(official nintendo seal of quality|official nintendo seal|seal of quality|official seal|licensed by nintendo|licensed by sega|licensed by|made in japan|made in usa|printed in usa|printed in japan|all rights reserved)\b/ig, '');
          // Remove serial codes
          cleaned = cleaned.replace(/\b[a-z]{3,4}[- ]?\d{3,5}\b/ig, '');
          cleaned = cleaned.replace(/\b(nes|dmg|cgb|agb)[- ][a-z]{2,4}(?:[- ][a-z]{3})?\b/ig, '');
          cleaned = cleaned.replace(/\bT[- ]?\d{4,6}\b/ig, '');
          cleaned = cleaned.replace(/^(?=[a-z]*\d)(?=\d*[a-z])[a-z\d]{5,}$/ig, '');
          // Remove price tags
          cleaned = cleaned.replace(/\$\d+(?:\.\d{2})?/g, '');
          // Remove console names, brand names, and network badges
          cleaned = cleaned.replace(/\b(xbox 360|xbox|playstation|ps1|ps2|ps3|ps4|ps5|nintendo|nes|snes|sega|genesis|gameboy|game boy|gamecube|wii|wii u|wiiu|ds|3ds|psp|vita|switch|sony|microsoft|live|xbox live|psn|playstation network|nintendo network|wi-fi|wifi|windows|dos|ms-dos|cd-rom|cdrom|dvd-rom|dvdrom|software|pc cd|pc dvd|floppy disc|floppy disk|diskette|macintosh|mac)\b/ig, '');
          
          return cleaned.trim().replace(/\s+/g, ' ');
        })
        .filter(l => l.length > 3 && !isGeneric(l));
        
      if (lines.length > 0) {
        if (logoName && !isGeneric(logoName, true)) {
          const logoWords = logoName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          if (logoWords.length > 0) {
            let logoIndex = -1;
            const firstWord = logoWords[0];
            for (let i = 0; i < lines.length; i++) {
              const regex = new RegExp(`\\b${firstWord}\\b`, 'i');
              if (regex.test(lines[i])) {
                const sliceLines = lines.slice(i, i + 3);
                const combined = sliceLines.join(' ').toLowerCase();
                if (logoWords.every(w => combined.includes(w))) {
                  logoIndex = i;
                  break;
                }
              }
            }

            if (logoIndex !== -1) {
              const candidates = [];
              const sliceLines = lines.slice(logoIndex, logoIndex + 3);
              for (const line of sliceLines) {
                if (candidates.length === 0) {
                  candidates.push(line);
                } else {
                  const combined = candidates.join(' ').toLowerCase();
                  const cleanLine = line.toLowerCase();
                  if (combined.includes(cleanLine)) continue;
                  const words = cleanLine.split(/\s+/);
                  if (words.every(w => combined.includes(w))) continue;
                  if (combined.length < 25) {
                    candidates.push(line);
                  } else {
                    break;
                  }
                }
              }
              ocrName = candidates.join(' ');
            } else {
              // Space-stripped matching
              const candidates = [];
              for (const line of lines) {
                if (candidates.length === 0) {
                  candidates.push(line);
                } else {
                  const combined = candidates.join(' ').toLowerCase();
                  const cleanLine = line.toLowerCase();
                  if (combined.includes(cleanLine)) continue;
                  const words = cleanLine.split(/\s+/);
                  if (words.every(w => combined.includes(w))) continue;
                  if (combined.length < 25) {
                    candidates.push(line);
                  } else {
                    break;
                  }
                }
              }
              const ocrTitle = candidates.join(' ');
              if (ocrTitle) {
                const cleanLogo = logoName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const cleanOcr = ocrTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanOcr.includes(cleanLogo) || cleanLogo.includes(cleanOcr)) {
                  ocrName = ocrTitle;
                }
              }
            }
          }
        }
        
        if (!ocrName) {
          const candidates = [];
          for (const line of lines) {
            if (candidates.length === 0) {
              candidates.push(line);
            } else {
              const combined = candidates.join(' ').toLowerCase();
              const cleanLine = line.toLowerCase();
              if (combined.includes(cleanLine)) continue;
              const words = cleanLine.split(/\s+/);
              if (words.every(w => combined.includes(w))) continue;
              if (combined.length < 25) {
                candidates.push(line);
              } else {
                break;
              }
            }
            if (candidates.length >= 3) break;
          }
          ocrName = candidates.join(' ');
        }
        
        if (ocrName) {
          ocrName = ocrName.replace(/\b\w/g, l => l.toUpperCase());
        }
      }
    }

    // 3. Try to get title from Web Entities
    let webEntityName = null;
    if (response.webDetection?.webEntities?.length > 0) {
      const validEntities = response.webDetection.webEntities.filter(e => 
        e.description && !isGeneric(e.description, true)
      );

      if (validEntities.length > 0) {
        validEntities.sort((a, b) => {
          const aWords = a.description.split(' ').length;
          const bWords = b.description.split(' ').length;
          const aScore = a.score + (aWords > 1 && aWords < 6 ? 0.3 : 0);
          const bScore = b.score + (bWords > 1 && bWords < 6 ? 0.3 : 0);
          return bScore - aScore;
        });

        webEntityName = validEntities[0].description;
      }
    }

    // 4. Try to get title from Best Guess Label
    let bestGuessName = null;
    if (response.webDetection?.bestGuessLabels?.length > 0 && response.webDetection.bestGuessLabels[0].label) {
      const guess = response.webDetection.bestGuessLabels[0].label;
      if (!isGeneric(guess, true)) {
        bestGuessName = guess.replace(/\b\w/g, l => l.toUpperCase());
      }
    }

    // Combine using the cleaned candidate resolution order:
    // Web Entity & Best Guess labels represent official internet catalog product titles,
    // so prefer them over raw OCR text lines off physical box artwork!
    if (webEntityName) {
      bestName = webEntityName;
    } else if (bestGuessName) {
      bestName = bestGuessName;
    } else if (ocrName) {
      bestName = ocrName;
    } else if (logoName && !isGeneric(logoName, true)) {
      bestName = logoName;
    } else if (logoName) {
      bestName = logoName;
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

function sanitizeTitleForSearch(name) {
  if (!name || name === 'Unknown Item' || name === 'Unknown Item (Needs Review)') return '';
  let clean = name;
  // Strip trailing file extension suffixes (e.g. .MP, .MP4, .JPG, .PNG, .WEBP, .GIF)
  clean = clean.replace(/\.(mp|mp4|jpg|jpeg|png|webp|gif|mov|avi|mkv)$/i, '');
  // Strip bracketed noise like [Pre ...] or unclosed [Pre ...
  clean = clean.replace(/\[\s*pre\b.*$/gi, '');
  // Normalize symbols/slashes/parentheses to spaces
  clean = clean.replace(/[-|_/\\()]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Strip trailing dots/ellipses
  clean = clean.replace(/[\.\s]+$/g, '').trim();
  return clean;
}

async function fetchSearxngPrice(name, extraKeywords = '') {
  const searxngUrl = process.env.SEARXNG_URL;
  if (!searxngUrl || !name) return null;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html;q=0.9, */*;q=0.8'
  };

  try {
    // 1000ms pace delay between SearXNG requests to prevent engine CAPTCHA suspensions
    await new Promise(r => setTimeout(r, 1000));

    // Clean up Google-specific OR and parentheses syntax for SearXNG
    const cleanExtra = extraKeywords
      .replace(/[()]/g, '')     // remove parentheses
      .replace(/\bOR\b/g, '')   // remove OR keywords
      .replace(/\s+/g, ' ')     // collapse spaces
      .trim();

    const q = `${name} ${cleanExtra}`.replace(/\s+/g, ' ').trim();
    const query = encodeURIComponent(q);
    const url = `${searxngUrl.replace(/\/$/, '')}/search?q=${query}&format=json`;
    console.log(`[Worker] Querying SearXNG API for prices: "${q}"`);

    let res = null;
    try {
      res = await axios.get(url, { headers, timeout: 10000 });
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) {
        console.log(`[Worker WARNING] SearXNG instance at "${searxngUrl}" is DOWN / Connection Refused. Please start SearXNG Docker container in Settings (or run 'docker start searxng' on Pi).`);
        return null;
      }
      console.log(`[Worker] SearXNG JSON API endpoint error (${err.message}). Trying SearXNG HTML search fallback...`);
      // HTML Endpoint Fallback if JSON format is disabled in SearXNG settings.yml
      const htmlUrl = `${searxngUrl.replace(/\/$/, '')}/search?q=${query}`;
      try {
        const htmlRes = await axios.get(htmlUrl, { headers, timeout: 10000 });
        if (htmlRes.data && typeof htmlRes.data === 'string') {
          const cleanText = htmlRes.data
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ');
          const priceMatches = cleanText.match(/\$\s*[0-9,]+(?:\.[0-9]{2})?/g);
          if (priceMatches && priceMatches.length > 0) {
            let prices = [];
            for (const match of priceMatches) {
              const val = parseFloat(match.replace(/[^0-9.]/g, ''));
              if (!isNaN(val) && val > 0 && val < 50000) prices.push(val);
            }
            prices = [...new Set(prices)].sort((a, b) => a - b);
            if (prices.length > 0) {
              if (prices.length > 2) {
                const filtered = prices.filter(p => p >= 0.50);
                if (filtered.length > 0) prices = filtered;
              }
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
        }
      } catch (htmlErr) {
        console.log(`[Worker] SearXNG HTML fallback also failed: ${htmlErr.message}`);
      }
      return null;
    }

    if (res && res.data && res.data.results && res.data.results.length > 0) {
      let prices = [];

      for (const item of res.data.results) {
        // Parse snippet/title text for explicit "$XX.XX" patterns
        const text = `${item.title || ''} ${item.snippet || ''} ${item.content || ''}`;
        const priceMatches = text.match(/\$\s*[0-9,]+(?:\.[0-9]{2})?/g);
        if (priceMatches) {
          for (const match of priceMatches) {
            const val = parseFloat(match.replace(/[^0-9.]/g, ''));
            // Skip invalid numbers, sub-50 cent noise, or year numbers (1900-2035 integers)
            if (!isNaN(val) && val >= 0.50 && val < 50000) {
              if (val >= 1900 && val <= 2035 && Number.isInteger(val)) {
                continue; // Ignore release/manufacturing years
              }
              prices.push(val);
            }
          }
        }
      }

      // Deduplicate and sort
      prices = [...new Set(prices)].sort((a, b) => a - b);

      if (prices.length > 0) {
        // Filter out extreme sub-dollar noise (< $0.50) if higher prices exist
        if (prices.length > 2) {
          const filtered = prices.filter(p => p >= 0.50);
          if (filtered.length > 0) prices = filtered;
        }

        // Trim top/bottom outliers only when we have a large sample (6+ data points)
        if (prices.length >= 6) {
          const trimCount = Math.max(1, Math.floor(prices.length * 0.10));
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
    console.log('[Worker] SearXNG Search Price error:', e.message);
  }
  return null;
}

async function fetchSearchEnginePrice(name, extraKeywords = '') {
  console.log(`[Worker Debug] fetchSearchEnginePrice called. SEARXNG_URL is: "${process.env.SEARXNG_URL}"`);
  if (process.env.SEARXNG_URL) {
    return await fetchSearxngPrice(name, extraKeywords);
  }
  return null;
}

async function fetchToyMarketValue(name, condition) {
  const cleanName = sanitizeTitleForSearch(name);
  if (!cleanName) return null;
  const cleanCond = (condition && condition !== 'Unknown Condition') ? (condition === 'Loose' ? 'loose' : 'new in box') : '';
  return await fetchSearchEnginePrice(cleanName, `${cleanCond} toy ebay`.trim());
}

async function fetchGenericMarketValue(name) {
  const cleanName = sanitizeTitleForSearch(name);
  if (!cleanName) return null;

  // Optimized query sequence: start with clean title + ebay, then clean title + price, then bare clean title
  const queries = [
    `${cleanName} ebay`,
    `${cleanName} price`,
    cleanName
  ];

  for (const q of queries) {
    const price = await fetchSearchEnginePrice(q);
    if (price) return price;
  }

  return null;
}

async function fetchBottleMarketValue(name) {
  const cleanName = sanitizeTitleForSearch(name);
  if (!cleanName) return null;

  const hasBottleKeyword = /\bbottle\b/i.test(cleanName);
  const extraKw = hasBottleKeyword ? 'ebay' : 'bottle ebay';

  return await fetchSearchEnginePrice(cleanName, extraKw);
}

export async function fetchWikipediaMovieMetadata(name) {
  if (!name) return null;
  try {
    const searchQuery = `${name} film`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
    const searchRes = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Antigravity-POS-Scanner/1.9' },
      timeout: 10000
    });
    
    if (searchRes.data && searchRes.data.query && searchRes.data.query.search && searchRes.data.query.search.length > 0) {
      const title = searchRes.data.query.search[0].title;
      const detailsUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|info&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&pithumbsize=500&format=json&origin=*&inprop=url`;
      const detailsRes = await axios.get(detailsUrl, {
        headers: { 'User-Agent': 'Antigravity-POS-Scanner/1.9' },
        timeout: 10000
      });
      
      if (detailsRes.data && detailsRes.data.query && detailsRes.data.query.pages) {
        const pages = detailsRes.data.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId && pageId !== '-1') {
          const page = pages[pageId];
          const moviePlot = page.extract || null;
          const movieImage = page.thumbnail ? page.thumbnail.source : null;
          
          return {
            moviePlot,
            movieCast: null,
            movieTrailer: null,
            movieImage
          };
        }
      }
    }
  } catch (e) {
    console.error('Wikipedia Movie Metadata Fetch error:', e.message);
  }
  return null;
}

export async function fetchYouTubeTrailer(name) {
  if (!name) return null;
  try {
    const searchResults = await fetchOrganicSearch(`${name} movie trailer youtube`);
    if (searchResults && searchResults.length > 0) {
      for (const res of searchResults) {
        const url = res.url || '';
        if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
          return url;
        }
      }
    }
  } catch (e) {
    console.error('YouTube trailer search error:', e.message);
  }
  return null;
}

export async function fetchDiscogsMetadata(barcode) {
  if (!barcode) return null;
  const token = process.env.DISCOGS_API_KEY;
  if (!token) {
    console.warn('[Worker] Discogs API key not configured. Skipping lookup.');
    return null;
  }
  try {
    console.log(`[Worker] Querying Discogs API for barcode: ${barcode}`);
    const res = await axios.get(`https://api.discogs.com/database/search`, {
      params: { barcode, token },
      headers: { 'User-Agent': 'Antigravity-POS-Scanner/1.9' },
      timeout: 5000
    });
    if (res.data && res.data.results && res.data.results.length > 0) {
      const release = res.data.results[0];
      const title = release.title || '';
      const parts = title.split(' - ');
      const artist = parts[0]?.trim() || 'Unknown Artist';
      const album = parts.slice(1).join(' - ')?.trim() || title;
      const pressingYear = release.year ? parseInt(release.year) : null;
      const pressingCountry = release.country || null;
      const formats = release.format || [];
      const isVinyl = formats.some(f => f.toLowerCase().includes('vinyl'));
      const format = formats.join(', ') || 'Vinyl';

      return {
        name: `${artist} - ${album}`,
        description: `[Identified via Discogs API]\n\nArtist: ${artist}\nAlbum: ${album}\nFormat: ${format}\nYear: ${pressingYear || 'N/A'}\nCountry: ${pressingCountry || 'N/A'}\nDiscogs ID: ${release.id}`,
        imageUrl: release.cover_image || null,
        musicArtist: artist,
        musicFormat: isVinyl ? 'Vinyl' : formats[0] || 'Vinyl',
        musicPressingYear: pressingYear,
        musicPressingCountry: pressingCountry,
        discogsReleaseId: release.id
      };
    }
  } catch (e) {
    console.error('Discogs API error:', e.message);
  }
  return null;
}

export async function fetchHardwareSpecs(query) {
  if (!query) return null;
  try {
    console.log(`[Worker] Querying Web Search for hardware specifications: ${query}`);
    const results = await fetchOrganicSearch(`${query} specifications specs CPU-World TechPowerUp EveryMac`);
    if (results && results.length > 0) {
      const snippet = results.map(r => r.snippet).join(' ').substring(0, 500);
      const q = query.toLowerCase();
      let brand = 'Generic';
      if (q.includes('apple') || q.includes('mac')) brand = 'Apple';
      else if (q.includes('ibm')) brand = 'IBM';
      else if (q.includes('intel')) brand = 'Intel';
      else if (q.includes('amd')) brand = 'AMD';
      else if (q.includes('nvidia')) brand = 'NVIDIA';
      else if (q.includes('commodore')) brand = 'Commodore';
      else if (q.includes('dell')) brand = 'Dell';
      else if (q.includes('hp')) brand = 'HP';
      
      let type = 'System';
      if (q.includes('cpu') || q.includes('processor') || q.includes('pentium') || q.includes('celeron') || q.includes('athlon') || q.includes('xeon') || q.includes('core i')) type = 'CPU';
      else if (q.includes('gpu') || q.includes('graphics') || q.includes('geforce') || q.includes('radeon')) type = 'GPU';
      else if (q.includes('drive') || q.includes('ssd') || q.includes('hdd')) type = 'Drive';
      
      return {
        name: query,
        description: `[Specifications identified via Web Search]\n\n${snippet}`,
        hardwareBrand: brand,
        hardwareModel: query,
        hardwareType: type,
        hardwareSpecs: snippet
      };
    }
  } catch (e) {
    console.error('Hardware Specs fetch error:', e.message);
  }
  return null;
}


export async function fetchToolDetails(query) {
  if (!query) return null;
  try {
    console.log(`[Worker] Querying Web Search for tool details: ${query}`);
    const results = await fetchOrganicSearch(`${query} tool specs manual`);
    if (results && results.length > 0) {
      const snippet = results.map(r => r.snippet).join(' ').substring(0, 500);
      const q = query.toLowerCase();
      let brand = 'Generic';
      if (q.includes('dewalt')) brand = 'DeWalt';
      else if (q.includes('makita')) brand = 'Makita';
      else if (q.includes('milwaukee')) brand = 'Milwaukee';
      else if (q.includes('hakko')) brand = 'Hakko';
      else if (q.includes('ryobi')) brand = 'Ryobi';
      else if (q.includes('bosch')) brand = 'Bosch';
      else if (q.includes('craftsman')) brand = 'Craftsman';
      else if (q.includes('dremel')) brand = 'Dremel';
      
      return {
        name: query,
        description: `[Tool identified via Web Search]\n\n${snippet}`,
        toolBrand: brand,
        toolModel: query
      };
    }
  } catch (e) {
    console.error('Tool Specs fetch error:', e.message);
  }
  return null;
}

async function fetchOrganicSearch(q) {
  const query = encodeURIComponent(q);

  // 1. Try SearXNG first if configured
  const searxngUrl = process.env.SEARXNG_URL;
  if (searxngUrl) {
    try {
      const url = `${searxngUrl.replace(/\/$/, '')}/search?q=${query}&format=json`;
      console.log(`[Worker] Querying SearXNG for organic search: "${q}"`);
      const res = await axios.get(url, { timeout: 10000 });
      if (res.data && res.data.results) {
        return res.data.results.map(item => ({
          title: item.title || '',
          snippet: item.snippet || item.content || '',
          thumbnail: item.thumbnail || null,
          url: item.url || ''
        }));
      }
    } catch (e) {
      console.error('[Worker] SearXNG Organic Search error:', e.message);
    }
  }

  return [];
}

async function fetchVideoMarketValue(name) {
  const cleanName = sanitizeTitleForSearch(name);
  if (!cleanName) return null;
  return await fetchSearchEnginePrice(cleanName, 'movie ebay');
}

async function fetchVideoGameMarketValue(name, gameSystem = null) {
  const cleanName = sanitizeTitleForSearch(name);
  if (!cleanName) return null;
  const sysTag = gameSystem ? gameSystem : '';
  const query = `${cleanName} ${sysTag} video game ebay`.replace(/\s+/g, ' ').trim();
  return await fetchSearchEnginePrice(query);
}

async function fetchCoinMarketValue(name, condition) {
  const cleanName = sanitizeTitleForSearch(name);
  if (!cleanName) return null;
  const cleanCond = (condition && condition !== 'Ungraded' && condition !== 'Unknown Condition') ? condition : '';
  return await fetchSearchEnginePrice(cleanName, `${cleanCond} coin ebay`.trim());
}

async function fetchGradingAgencyBarcode(barcode) {
  try {
    const q = `PCGS OR NGC cert ${barcode}`;
    const results = await fetchOrganicSearch(q);
    
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
  const cleanName = sanitizeTitleForSearch(name);
  if (!cleanName) return null;
  const cleanCond = (condition && condition !== 'Unknown Condition' && condition !== 'Raw / Ungraded') ? `${condition}` : '';
  const query = `${cleanName} ${cleanCond} comic ebay`.replace(/\s+/g, ' ').trim();
  return await fetchSearchEnginePrice(query);
}

async function fetchCardMarketValue(name, condition) {
  const cleanName = sanitizeTitleForSearch(name);
  if (!cleanName) return null;
  const cleanCond = (condition && condition !== 'Raw (Ungraded)' && condition !== 'Unknown Condition') ? condition : '';
  const query = `${cleanName} ${cleanCond} card ebay`.replace(/\s+/g, ' ').trim();
  return await fetchSearchEnginePrice(query);
}

async function fetchCardGradingAgencyBarcode(barcode) {
  try {
    const q = `PSA OR BGS OR SGC cert ${barcode}`;
    const results = await fetchOrganicSearch(q);
    
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
  const cleanCond = (condition && condition !== 'Unknown Condition') ? condition : '';
  const query = `${name} ${agency || ''} ${cleanCond} value price estimate`.trim().replace(/\s+/g, ' ');
  const price = await fetchSearchEnginePrice(query);
  if (price) return price;

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

function extractVideoGameGrading(str) {
  if (!str) return { agency: null, cond: null, cert: null };
  let agency = null;
  let cond = null;
  let cert = null;

  if (/\bWATA\b/i.test(str)) agency = 'WATA';
  else if (/\bVGA\b/i.test(str)) agency = 'VGA';
  else if (/\bCGC\b/i.test(str)) agency = 'CGC';
  else if (/\b(PSA|ESA)\b/i.test(str)) agency = 'PSA';

  if (agency) {
    // 1. Try matching video game composite grade first (e.g. 9.8 A++ or 9.0 A)
    const compositeRegex = /\b(\d{1,2}(?:\.\d)?)\s*(A\+\+|A\+|A|B\+|B|C)(?!\w)/i;
    const compositeMatch = str.match(compositeRegex);
    if (compositeMatch) {
      cond = `${compositeMatch[1]} ${compositeMatch[2].toUpperCase()}`;
    } else {
      // 2. Fall back to general graded conditions
      const conditionRegex = /\b(A\+\+|A\+|A|B\+|B|C|MINT|GEM MINT|PRISTINE|NM-MT|NM|EX-MT|EX|VG-EX|VG|GOOD|POOR|GEM|MT|MS-?\d{1,2}|PR-?\d{1,2}|VF|FN)[\s-]+(\d{1,2}(?:\.\d)?\+?)?\b|\b(10(?:\.0)?|[0-9]\.\d|100|[1-9]\d\+?)\b/i;
      const conditionMatch = str.match(conditionRegex);
      if (conditionMatch) {
        if (conditionMatch[1]) {
           cond = `${conditionMatch[1].toUpperCase()}${conditionMatch[2] ? ' ' + conditionMatch[2] : ''}`;
        } else if (conditionMatch[3]) {
           cond = conditionMatch[3];
        }
      }
    }

    const certMatch = str.match(/\b\d{7,14}\b/);
    if (certMatch) cert = certMatch[0];
  }

  return { agency, cond, cert };
}

export async function fetchItemDetails(item, db, options = {}) {
  const barcode = item.barcode;
  let details = null;
  let rateLimited = false;

  // --- GLOBAL API CONFIGURATION INJECTION ---
  try {
    const globalDb = await getGlobalDb();
    const keysRow = globalDb.prepare("SELECT value FROM system_settings WHERE key = 'api_keys'").get();
    if (keysRow) {
      const keys = JSON.parse(keysRow.value);
      console.log(`[Worker Debug] Loaded API keys. searxngUrl in DB: "${keys.searxngUrl}"`);
      if (keys.googleVisionKey) {
        process.env.GOOGLE_VISION_API_KEY = keys.googleVisionKey;
        process.env.GOOGLE_VISION_KEY = keys.googleVisionKey;
      }
      if (keys.googleBooksKey) {
        process.env.GOOGLE_BOOKS_API_KEY = keys.googleBooksKey;
      }
      if (keys.serpApiKey) {
        process.env.SERPAPI_KEY = keys.serpApiKey;
      }
      if (keys.priceChartingKey) {
        process.env.PRICECHARTING_KEY = keys.priceChartingKey;
      }
      if (keys.discogsApiKey) {
        process.env.DISCOGS_API_KEY = keys.discogsApiKey;
      }

      if (keys.searxngUrl) {
        process.env.SEARXNG_URL = keys.searxngUrl;
      }
    }
  } catch (e) {
    console.error('Error injecting global API keys:', e);
  }
  // ------------------------------------------

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

    if (!isPremium) {
      process.env.SERPAPI_KEY = '';
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
      } else if (options.forceTier === 'music') {
        if (barcode) {
          details = await fetchDiscogsMetadata(barcode);
        }
      } else if (options.forceTier === 'hardware') {
        if (item.name && item.name !== 'Pending Sync' && item.name !== 'Analyzing Photo...') {
          details = await fetchHardwareSpecs(item.name);
        } else if (barcode) {
          details = await fetchHardwareSpecs(barcode);
        }
      } else if (options.forceTier === 'tool') {
        if (item.name && item.name !== 'Pending Sync' && item.name !== 'Analyzing Photo...') {
          details = await fetchToolDetails(item.name);
        } else if (barcode) {
          details = await fetchToolDetails(barcode);
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
        if (item.itemType === 'tool') {
          details = await fetchToolDetails(item.name || barcode);
        } else if (item.itemType === 'hardware') {
          details = await fetchHardwareSpecs(item.name || barcode);
        } else if (item.itemType === 'music') {
          details = await fetchDiscogsMetadata(barcode);
        } else if (item.itemType === 'coin') {
          details = await fetchGradingAgencyBarcode(barcode);
        } else if (item.itemType === 'card') {
          details = await fetchCardGradingAgencyBarcode(barcode);
        } else if (!(barcode.startsWith('2') || barcode.length < 10 || barcode.length > 14)) {
          if (barcode.length >= 10 && (barcode.startsWith('978') || barcode.startsWith('979') || barcode.length === 10)) {
            try {
              details = await fetchGoogleBooks(barcode);
            } catch (err) {
              console.warn(`[Worker] fetchGoogleBooks failed for barcode ${barcode}: ${err.message}`);
            }
            if (!details) {
              try {
                details = await fetchOpenLibrary(barcode);
              } catch (err) {
                console.warn(`[Worker] fetchOpenLibrary failed for barcode ${barcode}: ${err.message}`);
              }
            }
          }
          if (!details) {
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

    const isCustomName = item.name && 
                         item.name !== 'Analyzing Photo...' && 
                         item.name !== 'Unknown Item' && 
                         item.name !== 'Unknown Item (Needs Review)' &&
                         item.name !== 'Pending Sync' &&
                         item.name.trim() !== '';
    let name = isCustomName ? item.name : ((details && details.name) ? details.name : 'Unknown Item');
    const hasIdentifiedName = details && details.name && 
                              details.name !== 'Unknown Item' && 
                              details.name !== 'Unknown Item (Needs Review)' && 
                              details.name.trim() !== '';
    const newStatus = (details && (isCustomName || hasIdentifiedName)) ? 'success' : 'failed';
    let imagePath = (details && details.imageUrl) ? details.imageUrl : item.imagePath;
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

    // Auto-classify standard items as video game if category or name suggests it
    if (itemType === 'standard') {
      let isGame = false;
      if (details && details.category) {
        const cat = details.category.toLowerCase();
        if (cat.includes('video game') || 
            cat.includes('game console') || 
            cat.includes('consoles >') || 
            cat.includes('software > games') ||
            cat.includes('toys & games > games > video games')) {
          isGame = true;
        }
      }
      if (!isGame && name) {
        const lowerName = name.toLowerCase();
        const platformRegex = /\b(snes|nes|n64|nintendo 64|sega genesis|playstation|ps1|ps2|ps3|ps4|ps5|xbox 360|xbox one|xbox series|nintendo ds|nintendo 3ds|nintendo switch|gameboy|game boy|gamecube)\b/i;
        if (platformRegex.test(lowerName)) {
          isGame = true;
        }
      }
      if (isGame) {
        console.log(`[Worker] Auto-classified item "${name}" as Video Game.`);
        itemType = 'game';
      }
    }

    let moviePlot = item.moviePlot || null;
    let movieCast = item.movieCast || null;
    let movieTrailer = item.movieTrailer || null;
    let movieFormat = item.movieFormat || null;

    let gameSystem = item.gameSystem || null;
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

    let musicArtist = item.musicArtist || null;
    let musicFormat = item.musicFormat || null;
    let musicMatrixRunout = item.musicMatrixRunout || null;
    let musicPressingYear = item.musicPressingYear || null;
    let musicPressingCountry = item.musicPressingCountry || null;
    let musicVinylWeight = item.musicVinylWeight || null;
    let musicMediaCondition = item.musicMediaCondition || null;
    let musicSleeveCondition = item.musicSleeveCondition || null;
    let discogsReleaseId = item.discogsReleaseId || null;

    let hardwareBrand = item.hardwareBrand || null;
    let hardwareModel = item.hardwareModel || null;
    let hardwareSerial = item.hardwareSerial || null;
    let hardwareType = item.hardwareType || null;
    let hardwareFirmware = item.hardwareFirmware || null;
    let hardwareCondition = item.hardwareCondition || null;
    let hardwareSpecs = item.hardwareSpecs || null;
    let hardwareCompat = item.hardwareCompat || null;
    let hardwareSmartHealth = item.hardwareSmartHealth || null;

    let toolBrand = item.toolBrand || null;
    let toolModel = item.toolModel || null;
    let toolSerial = item.toolSerial || null;
    let toolWarrantyStatus = item.toolWarrantyStatus || null;
    let toolAssignedLocation = item.toolAssignedLocation || null;
    let toolPurchaseDate = item.toolPurchaseDate || null;

    if ((itemType === 'video' || options.forceTier === 'video') && name && name !== 'Unknown Item') {
      // Auto-detect movieFormat from name/description if not set
      if (!movieFormat && name) {
        const lowerName = name.toLowerCase();
        const lowerDesc = (description || '').toLowerCase();
        const searchStr = lowerName + ' ' + lowerDesc;
        
        if (/\b(vhs|videotape|video tape)\b/i.test(searchStr)) {
          movieFormat = 'VHS';
        } else if (/\b(dvd)\b/i.test(searchStr)) {
          movieFormat = 'DVD';
        } else if (/\b(blu-ray|bluray|blu ray|bd)\b/i.test(searchStr)) {
          movieFormat = 'Blu-ray';
        } else if (/\b(4k|uhd|4k ultra hd)\b/i.test(searchStr)) {
          movieFormat = '4K Ultra HD';
        } else if (/\b(laserdisc|laser disc|ld)\b/i.test(searchStr)) {
          movieFormat = 'LaserDisc';
        } else if (/\b(betamax|beta)\b/i.test(searchStr)) {
          movieFormat = 'BetaMax';
        } else if (/\b(vcd|video cd)\b/i.test(searchStr)) {
          movieFormat = 'VCD';
        } else if (/\b(hd dvd|hddvd)\b/i.test(searchStr)) {
          movieFormat = 'HD DVD';
        } else if (/\b(digital copy)\b/i.test(searchStr)) {
          movieFormat = 'Digital Copy';
        }
      }

      let movieData = null;

      if (!options.refreshPrices) {
        console.log(`[Worker] Querying Wikipedia for movie details: ${name}`);
        movieData = await fetchWikipediaMovieMetadata(name);
        
        // Fetch trailer link using YouTube helper
        const trailerUrl = await fetchYouTubeTrailer(name);
        if (trailerUrl) {
          movieTrailer = trailerUrl;
        }
      }

      if (movieData) {
        moviePlot = movieData.moviePlot;
        movieCast = movieData.movieCast;
        if (movieData.movieImage && (!imagePath || imagePath.trim() === '' || imagePath.includes('placeholder') || imagePath.includes('Analyzing Photo...'))) {
          imagePath = movieData.movieImage;
        }
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
      if (!options.refreshPrices) {
        // Reset so Refetch doesn't carry over old values
        gradedAgency = null;
        gradedCondition = null;
        gradedCertNumber = null;

        // 1. Try extracting from name first
        const fromName = extractVideoGameGrading(name);
        gradedAgency = fromName.agency;
        gradedCondition = fromName.cond;
        gradedCertNumber = fromName.cert;

        // 2. If not fully resolved, check description
        if ((!gradedAgency || !gradedCondition || !gradedCertNumber) && description) {
          let dtMatch = description.match(/Detected Text:\s*(.+)/i);
          let textToSearch = dtMatch ? dtMatch[1] : description;
          const fromDesc = extractVideoGameGrading(textToSearch);

          if (!gradedAgency) gradedAgency = fromDesc.agency;
          if (!gradedCondition) gradedCondition = fromDesc.cond;
          if (!gradedCertNumber) gradedCertNumber = fromDesc.cert;

          // OVERRIDE HALLUCINATED NAMES WITH OCR TITLE (only if description has OCR text)
          if (dtMatch && gradedAgency) {
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

      // Auto-detect gameSystem from name or description if not set
      if (!gameSystem && name) {
        const lowerName = name.toLowerCase();
        const lowerDesc = (description || '').toLowerCase();
        const searchStr = lowerName + ' ' + lowerDesc;
        
        if (/\b(nes|nintendo entertainment system)\b/i.test(searchStr)) {
          gameSystem = 'Nintendo Entertainment System (NES)';
        } else if (/\b(snes|super nintendo|super nes)\b/i.test(searchStr)) {
          gameSystem = 'Super Nintendo (SNES)';
        } else if (/\b(n64|nintendo 64)\b/i.test(searchStr)) {
          gameSystem = 'Nintendo 64 (N64)';
        } else if (/\b(gamecube|nintendo gamecube)\b/i.test(searchStr)) {
          gameSystem = 'Nintendo GameCube';
        } else if (/\b(wii)\b/i.test(searchStr) && !/\bwii u\b/i.test(searchStr)) {
          gameSystem = 'Nintendo Wii';
        } else if (/\b(wii u|wiiu)\b/i.test(searchStr)) {
          gameSystem = 'Nintendo Wii U';
        } else if (/\b(switch|nintendo switch)\b/i.test(searchStr)) {
          gameSystem = 'Nintendo Switch';
        } else if (/\b(gameboy|game boy)\b/i.test(searchStr) && !/\bcolor\b/i.test(searchStr) && !/\badvance\b/i.test(searchStr)) {
          gameSystem = 'Game Boy';
        } else if (/\b(game boy color|gbc)\b/i.test(searchStr)) {
          gameSystem = 'Game Boy Color';
        } else if (/\b(game boy advance|gba)\b/i.test(searchStr)) {
          gameSystem = 'Game Boy Advance';
        } else if (/\b(ds|nintendo ds)\b/i.test(searchStr) && !/\b3ds\b/i.test(searchStr)) {
          gameSystem = 'Nintendo DS';
        } else if (/\b(3ds|nintendo 3ds)\b/i.test(searchStr)) {
          gameSystem = 'Nintendo 3DS';
        } else if (/\b(genesis|sega genesis|mega drive)\b/i.test(searchStr)) {
          gameSystem = 'Sega Genesis';
        } else if (/\b(dreamcast)\b/i.test(searchStr)) {
          gameSystem = 'Sega Dreamcast';
        } else if (/\b(saturn|sega saturn)\b/i.test(searchStr)) {
          gameSystem = 'Sega Saturn';
        } else if (/\b(playstation|ps1|psx)\b/i.test(searchStr)) {
          gameSystem = 'PlayStation (PS1)';
        } else if (/\b(playstation 2|ps2)\b/i.test(searchStr)) {
          gameSystem = 'PlayStation 2 (PS2)';
        } else if (/\b(playstation 3|ps3)\b/i.test(searchStr)) {
          gameSystem = 'PlayStation 3 (PS3)';
        } else if (/\b(playstation 4|ps4)\b/i.test(searchStr)) {
          gameSystem = 'PlayStation 4 (PS4)';
        } else if (/\b(playstation 5|ps5)\b/i.test(searchStr)) {
          gameSystem = 'PlayStation 5 (PS5)';
        } else if (/\b(psp|playstation portable)\b/i.test(searchStr)) {
          gameSystem = 'PlayStation Portable (PSP)';
        } else if (/\b(ps vita|vita)\b/i.test(searchStr)) {
          gameSystem = 'PlayStation Vita';
        } else if (/\bxbox\b/i.test(searchStr) && !/\b360\b/i.test(searchStr) && !/\bone\b/i.test(searchStr) && !/\bseries\b/i.test(searchStr)) {
          gameSystem = 'Xbox';
        } else if (/\b(xbox 360|360)\b/i.test(searchStr)) {
          gameSystem = 'Xbox 360';
        } else if (/\b(xbox one|one)\b/i.test(searchStr)) {
          gameSystem = 'Xbox One';
        } else if (/\b(xbox series|series x|series s)\b/i.test(searchStr)) {
          gameSystem = 'Xbox Series X/S';
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
        const marketData = await fetchVideoGameMarketValue(name, gameSystem);
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
    } else if ((itemType === 'music' || options.forceTier === 'music') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is Music. Extracting details and calculating Market Value for: ${name}`);
      
      if (!options.refreshPrices && details) {
        if (details.musicArtist) musicArtist = details.musicArtist;
        if (details.musicFormat) musicFormat = details.musicFormat;
        if (details.musicPressingYear) musicPressingYear = details.musicPressingYear;
        if (details.musicPressingCountry) musicPressingCountry = details.musicPressingCountry;
        if (details.discogsReleaseId) discogsReleaseId = details.discogsReleaseId;
      }
      
      // Default condition descriptors for Music items
      if (!options.refreshPrices && !musicMediaCondition) {
        musicMediaCondition = 'VG+';
      }
      if (!options.refreshPrices && !musicSleeveCondition) {
        musicSleeveCondition = 'VG+';
      }
    } else if ((itemType === 'hardware' || options.forceTier === 'hardware') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is Hardware. Extracting details for: ${name}`);
      
      if (!options.refreshPrices && details) {
        if (details.hardwareBrand) hardwareBrand = details.hardwareBrand;
        if (details.hardwareModel) hardwareModel = details.hardwareModel;
        if (details.hardwareType) hardwareType = details.hardwareType;
        if (details.hardwareSpecs) hardwareSpecs = details.hardwareSpecs;
      }
      
      if (!options.refreshPrices && !hardwareCondition) {
        hardwareCondition = 'Tested / Working';
      }
    } else if ((itemType === 'tool' || options.forceTier === 'tool') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is Tool. Extracting details for: ${name}`);
      
      if (!options.refreshPrices && details) {
        if (details.toolBrand) toolBrand = details.toolBrand;
        if (details.toolModel) toolModel = details.toolModel;
      }
      
      if (!options.refreshPrices && !toolWarrantyStatus) {
        toolWarrantyStatus = 'Unknown';
      }
      if (!options.refreshPrices && !toolAssignedLocation) {
        toolAssignedLocation = 'Workshop';
      }
    } else if ((itemType === 'bottle' || options.forceTier === 'bottle') && name && name !== 'Unknown Item') {
      console.log(`[Worker] Item is Bottle / Can / Glassware. Extracting details & market value for: ${name}`);
      const marketData = await fetchBottleMarketValue(name);
      if (marketData) {
        valueLow = marketData.valueLow;
        valueAvg = marketData.valueAvg;
        valueHigh = marketData.valueHigh;
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
          moviePlot = ?, movieCast = ?, movieTrailer = ?, movieFormat = ?,
          toyBrand = ?, toyYear = ?, toyCondition = ?, 
          coinCondition = ?, coinCertNumber = ?, coinGradingAgency = ?, 
          cardCondition = ?, cardCertNumber = ?, cardGradingAgency = ?, 
          comicCondition = ?, comicCertNumber = ?, comicGradingAgency = ?, comicPublisher = ?, comicIssue = ?,
          gradedCondition = ?, gradedCertNumber = ?, gradedAgency = ?,
          valueLow = ?, valueAvg = ?, valueHigh = ?,
          musicArtist = ?, musicFormat = ?, musicMatrixRunout = ?, musicPressingYear = ?, musicPressingCountry = ?, musicVinylWeight = ?, musicMediaCondition = ?, musicSleeveCondition = ?, discogsReleaseId = ?,
          hardwareBrand = ?, hardwareModel = ?, hardwareSerial = ?, hardwareType = ?, hardwareFirmware = ?, hardwareCondition = ?, hardwareSpecs = ?, hardwareCompat = ?, hardwareSmartHealth = ?,
          toolBrand = ?, toolModel = ?, toolSerial = ?, toolWarrantyStatus = ?, toolAssignedLocation = ?, toolPurchaseDate = ?,
          gameSystem = ?
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
      movieFormat,
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
      musicArtist,
      musicFormat,
      musicMatrixRunout,
      musicPressingYear,
      musicPressingCountry,
      musicVinylWeight,
      musicMediaCondition,
      musicSleeveCondition,
      discogsReleaseId,
      hardwareBrand,
      hardwareModel,
      hardwareSerial,
      hardwareType,
      hardwareFirmware,
      hardwareCondition,
      hardwareSpecs,
      hardwareCompat,
      hardwareSmartHealth,
      toolBrand,
      toolModel,
      toolSerial,
      toolWarrantyStatus,
      toolAssignedLocation,
      toolPurchaseDate,
      gameSystem,
      item.id
    );

      return { success: !!details, details };
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.warn(`[Worker] Rate limit or quota error encountered while processing ${item.id}`);
        db.prepare("UPDATE items SET syncStatus = 'rate_limited', lastSyncAttempt = ? WHERE id = ?").run(Date.now(), item.id);
        return { success: false, reason: 'rate_limited' };
      }
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

  const result = await fetchItemDetails(item, db, isRefresh ? { refreshPrices: true } : {});

  if (result.reason === 'rate_limited') {
    console.log(`[Worker] RATE LIMIT hit on item ${item.id}. Marking item as rate_limited and continuing queue.`);
    db.prepare("UPDATE items SET syncStatus = 'rate_limited', lastSyncAttempt = ? WHERE id = ?").run(Date.now(), item.id);
  }

  // Wait 12 seconds for barcode lookups (UPCItemDB limit) or 1.5s for photo scans
  const delayMs = item.barcode ? 12000 : 1500;
  setTimeout(() => {
    processNextItem();
  }, delayMs);
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
