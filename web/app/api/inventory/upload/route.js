import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { createRequire } from 'module';
import crypto from 'crypto';

const require = createRequire(import.meta.url);

function cleanNumber(str) {
  if (!str) return NaN;
  let cleaned = str.replace(/[^0-9.]/g, '');
  cleaned = cleaned.replace(/^\.+/, '').replace(/\.+$/, '');
  const val = parseFloat(cleaned);
  return val;
}

function isBeerOrSoda(cat) {
  return cat === 'BEER' || cat === 'SODA' || cat === 'Barringer' || cat === 'Caffey' || cat === 'Pepsi Co';
}

function getBeerDistributor(name) {
  const lower = name.toLowerCase();
  if (/budweiser|bud\s+light|stella|michelob|corona/i.test(lower)) {
    return 'Barringer';
  }
  return 'Caffey';
}


export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const countDate = formData.get('countDate') || new Date().toISOString().split('T')[0];

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    let fileText = '';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (file.name.endsWith('.pdf')) {
      console.log(`[Inventory Upload] Parsing scanned PDF: ${file.name}`);
      // Load canvas first and polyfill global classes for pdfjs-dist in Node.js
      const canvasModule = require('@napi-rs/canvas');
      global.DOMMatrix = canvasModule.DOMMatrix;
      global.ImageData = canvasModule.ImageData;
      global.Path2D = canvasModule.Path2D;
      global.DOMPoint = canvasModule.DOMPoint;
      global.DOMRect = canvasModule.DOMRect;
      global.Image = canvasModule.Image;

      const { PDFParse } = require('pdf-parse');
      const { createWorker } = require('tesseract.js');

      const parser = new PDFParse({ data: buffer });
      const result = await parser.getScreenshot({ scale: 2.0, imageDataUrl: true });

      const worker = await createWorker('eng');
      
      for (const page of result.pages) {
        const pageBuffer = Buffer.from(page.dataUrl.replace(/^data:image\/png;base64,/, ""), 'base64');
        const { data: { text } } = await worker.recognize(pageBuffer);
        fileText += `\n--- PAGE page_${page.pageNumber}.png ---\n` + text + '\n';
      }

      await worker.terminate();
    } else {
      fileText = buffer.toString('utf8');
    }

    // Now parse the inventory fileText using our token-based math-correcting solver
    const lines = fileText.split('\n');
    const parsedItems = [];
    let category = 'UNKNOWN';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect page boundary
      const pageMatch = trimmed.match(/---\s*PAGE\s*(?:page_)?(\d+)/i);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1], 10);
        if (pageNum === 1) {
          category = 'Barringer';
        } else if (pageNum === 2 || pageNum === 3) {
          category = 'WINE';
        } else if (pageNum >= 4) {
          category = 'LIQUOR';
        }
        continue;
      }

      // Detect category section headers
      let matchedCategory = null;
      if (trimmed.toUpperCase().includes('WHITE WINE')) {
        matchedCategory = 'WHITE WINE';
      } else if (trimmed.toUpperCase().includes('RED WINE')) {
        matchedCategory = 'RED WINE';
      } else if (trimmed.toUpperCase().includes('WINE')) {
        matchedCategory = 'WINE';
      } else if (trimmed.toUpperCase().includes('BARRINGER') || trimmed.toUpperCase().includes('ESE RE')) {
        matchedCategory = 'Barringer';
      } else if (trimmed.toUpperCase().includes('CAFFEY') || trimmed.toUpperCase().includes('CEES BY') || trimmed.toUpperCase().includes('AES A')) {
        matchedCategory = 'Caffey';
      } else if (trimmed.toUpperCase().includes('PEPSI CO')) {
        matchedCategory = 'Pepsi Co';
      } else if (trimmed.toUpperCase().includes('BEER')) {
        matchedCategory = 'BEER';
      } else if (trimmed.toUpperCase().includes('LIQUOR') || trimmed.toUpperCase().includes('SPIRIT')) {
        matchedCategory = 'LIQUOR';
      } else if (
        trimmed.toUpperCase().includes('SODA') ||
        trimmed.toUpperCase().includes('MIXER') ||
        trimmed.toUpperCase().includes('JUICE') ||
        trimmed.toUpperCase().includes('SYRUP')
      ) {
        matchedCategory = 'Pepsi Co';
      }

      if (matchedCategory) {
        category = matchedCategory;
        continue;
      }

      // Fuzzy inline transitions for page 1 categories
      if (category === 'Barringer' && /miller|yuengling|angry\s+orchard|guiness|guinness|sam\s+adams|heinekin|heineken|blue\s+moon|coors|porter|glutony|declaw|stout|ipa|lager|cider/i.test(trimmed)) {
        category = 'Caffey';
      }
      if ((category === 'Barringer' || category === 'Caffey') && /pepsi|dr\.?\s*pepper|mnt\.?\s*dew|mountain\s+dew|sierra\s+mist|lemonade|cheerwine|tonic|ginger\s+ale|ginger\s+beer|coke|coca\s+cola|sprite|soda|juice|syrup|puree|grenadine|sour\s+mix|red\s+bull/i.test(trimmed)) {
        category = 'Pepsi Co';
      }


      // Skip headers/footers
      if (
        trimmed.includes('INVENTORY FOR') ||
        trimmed.includes('ITEMNAME') ||
        trimmed.includes('QUANITY') ||
        trimmed.includes('--- PAGE') ||
        trimmed.includes('Price inventory') ||
        trimmed.includes('Price Inventory') ||
        trimmed.includes('Case Price')
      ) {
        continue;
      }

      const tokens = trimmed.split(/[\s|]+/).map(t => t.trim()).filter(t => t.length > 0);
      if (tokens.length < 2) continue;

      // Find numeric tokens (ignoring vintage years 1900-2099 and 5-8 digit item IDs)
      const numIndices = [];
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (/^(19|20)\d{2}$/.test(token)) {
          continue;
        }
        if (/^\d{5,8}$/.test(token)) {
          continue;
        }
        const clean = token.replace(/[^0-9.]/g, '').replace(/^\.+/, '').replace(/\.+$/, '');
        if (clean && !isNaN(parseFloat(clean))) {
          numIndices.push(i);
        }
      }

      if (numIndices.length < 2) continue;

      // Shift out leading row index if present
      if (numIndices.length >= 4 && numIndices[0] === 0) {
        numIndices.shift();
      }

      // Detect and extract category from columns (searching backwards from first numeric token)
      let itemCategory = null;
      const categoriesList = [
        'BEER', 'WINE', 'LIQUOR', 'SPIRITS', 'SPIRIT',
        'SODA', 'SODAS', 'BEVERAGE', 'BEVERAGES', 'MIXER', 'MIXERS', 'JUICE', 'SYRUP'
      ];
      const searchEndIdx = numIndices[0] - 1;
      for (let i = searchEndIdx; i >= 0; i--) {
        const tUpper = tokens[i].toUpperCase();
        if (categoriesList.includes(tUpper)) {
          if (['SPIRITS', 'SPIRIT'].includes(tUpper)) {
            itemCategory = 'LIQUOR';
          } else if (['SODA', 'SODAS', 'BEVERAGE', 'BEVERAGES', 'MIXER', 'MIXERS', 'JUICE', 'SYRUP'].includes(tUpper)) {
            itemCategory = 'Pepsi Co';
          } else {
            itemCategory = tUpper;
          }
          tokens.splice(i, 1);
          // Adjust numIndices offsets
          for (let j = 0; j < numIndices.length; j++) {
            if (numIndices[j] > i) {
              numIndices[j]--;
            }
          }
          break;
        }
      }

      const activeCategory = itemCategory || category;


      let qty = NaN;
      let cost = NaN;
      let total = NaN;

      if (numIndices.length === 2) {
        const costVal = cleanNumber(tokens[numIndices[0]]);
        const totalVal = cleanNumber(tokens[numIndices[1]]);
        cost = costVal;
        total = totalVal;
        if (cost > 0) {
          qty = parseFloat((total / cost).toFixed(2));
        }
      } else {
        const A = cleanNumber(tokens[numIndices[0]]);
        const B = cleanNumber(tokens[numIndices[1]]);
        const C = cleanNumber(tokens[numIndices[numIndices.length - 1]]);

        const tokenA = tokens[numIndices[0]];
        const tokenB = tokens[numIndices[1]];

        if (tokenA.startsWith('$')) {
          cost = A;
          qty = B;
        } else if (tokenB.startsWith('$')) {
          cost = B;
          qty = A;
        } else if (C === 0) {
          if (A > 0 && B === 0) {
            cost = A;
            qty = B;
          } else if (B > 0 && A === 0) {
            cost = B;
            qty = A;
          } else {
            cost = A;
            qty = B;
          }
        } else if (activeCategory === 'SODA' || activeCategory === 'Pepsi Co') {
          qty = A;
          cost = B;
        } else {
          if (B < 1.0 && A >= 1.0) {
            qty = A;
            cost = B;
          } else {
            cost = A;
            qty = B;
          }
        }
        total = C;
      }

      // Extract name from non-numeric tokens
      const nameTokens = [];
      for (let i = 0; i < tokens.length; i++) {
        if (!numIndices.includes(i)) {
          nameTokens.push(tokens[i]);
        }
      }
      let name = nameTokens.join(' ').trim();

      name = name.replace(/^[~|.\-_\[\]{}()]+/g, '')
                 .replace(/[~|.\-_\[\]{}()]+$/g, '')
                 .trim();

      while (/^\d+\s+/.test(name)) {
        name = name.replace(/^\d+\s+/, '');
      }

      name = name.replace(/^[~|.\-_\[\]{}()]+/g, '')
                 .replace(/[~|.\-_\[\]{}()]+$/g, '')
                 .replace(/\s+/g, ' ')
                 .trim();

      if (!name || name === 'TOTAL' || name === 'SUBTOTAL' || /^\$?\d+(\.\d+)?$/.test(name)) continue;

      // Brand-name keyword classification overrides
      let nameCategory = null;
      if (/cabernet|chardonnay|moscato|brut|grigio|blanc|merlot|zinfandel|pinot|proseco|prosecco|rose|riesling|malbec|syrah|bordeaux|sauvignon|shiraz|champagne|chianti|merus/i.test(name)) {
        nameCategory = 'WINE';
      } else if (/budweiser|bud\s+light|stella\s+artois|michelob|corona|miller\s+light|yuengling|angry\s+orchard|guiness|guinness|sam\s+adams|heinekin|heineken|blue\s+moon|coors|porter|glutony|declaw|stout|ipa|lager|cider/i.test(name)) {
        nameCategory = 'BEER';
      } else if (/pepsi|dr\.?\s*pepper|mnt\.?\s*dew|mountain\s+dew|sierra\s+mist|lemonade|cheerwine|tonic|ginger\s+ale|ginger\s+beer|coke|coca\s+cola|sprite|soda|juice|syrup|puree|grenadine|sour\s+mix|red\s+bull|aqua\s+pana|san\s+pelligrino|panna|pellegrino/i.test(name)) {
        nameCategory = 'SODA';
      } else if (/titos|stoli|absolut|kettle\s+one|ketel\s+one|grey\s+goose|g\.g\.|patron|jose\s+cuervo|beefeater|gordons|bombay|tanqueray|hendrick|myers|bacardi|malibu|capt\.?\s+morgan|captain\s+morgan|jack\s+daniel|knob\s+creek|makers\s+mark|maker's|wild\s+turkey|jim\s+beam|woodford|canadian\s+club|crown\s+royal|crown\s+reserve|seagram|bushmills|fireball|jameson|southern\s+comfort|scorsby|dewers|dewar|j\.?\s+walker|johnny\s+walker|johnnie\s+walker|glemorangie|glenmorangie|balvenie|glenlevit|glenlivet|macallum|macallan|chivas|remy\s+martin|henessy|hennessy|godiva|disaronno|amaretto|christian\s+bros|brandy|drambuie|cointreau|baileys|compari|campari|frangelico|chambord|sambuca|kahlua|grand\s+marnier|midori|creme\s+de|peachtree|dekyper|dekuyper|sour\s+apple|curacoa|curacao|triple\s+sec|vermouth|firefly/i.test(name)) {
        nameCategory = 'LIQUOR';
      }

      let finalCategory = nameCategory || activeCategory;
      if (finalCategory === 'BEER') {
        finalCategory = getBeerDistributor(name);
      } else if (finalCategory === 'SODA') {
        finalCategory = 'Pepsi Co';
      }


      // Constraint solver correction
      if (!isNaN(qty) && !isNaN(cost) && !isNaN(total)) {
        const expectedTotal = qty * cost;
        const difference = Math.abs(expectedTotal - total);

        if (difference > 0.05) {
          const calculatedCost = total / qty;
          const ratioTotal = expectedTotal > 0 ? total / expectedTotal : 0;

          if (cost > 5.0 && calculatedCost < 5.0) {
            qty = parseFloat((total / cost).toFixed(2));
          } else if (Math.abs(cost / calculatedCost - 100) < 5 || Math.abs(cost / calculatedCost - 10) < 5 || Math.abs(cost / calculatedCost - 1000) < 5) {
            cost = parseFloat(calculatedCost.toFixed(2));
          } else if (Math.abs(ratioTotal - 100) < 5 || Math.abs(ratioTotal - 10) < 5 || Math.abs(ratioTotal - 1000) < 50) {
            total = parseFloat(expectedTotal.toFixed(2));
          } else if (calculatedCost > 0 && calculatedCost < 500) {
            cost = parseFloat(calculatedCost.toFixed(2));
          }
        }
      }

      parsedItems.push({
        name,
        category: finalCategory,
        qty: isNaN(qty) ? 0 : qty,
        cost: isNaN(cost) ? 0 : cost,
        total: isNaN(total) ? 0 : total
      });
    }

    if (parsedItems.length === 0) {
      return NextResponse.json({ error: 'Could not parse any inventory items from the file.' }, { status: 400 });
    }

    // Save to DB
    const db = await getDb();
    
    // Check if a session already exists for this date and user
    let countRow = db.prepare('SELECT id FROM physical_counts WHERE countDate = ? AND userId = ?').get(countDate, user.id);
    let countId;
    let isNewSession = false;
    if (countRow) {
      countId = countRow.id;
    } else {
      countId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO physical_counts (id, countDate, status, userId)
        VALUES (?, ?, ?, ?)
      `).run(countId, countDate, 'completed', user.id);
      isNewSession = true;
    }

    // Prepare brand, variant, and item statements
    const checkBrandStmt = db.prepare('SELECT id FROM liquor_brands WHERE name = ? AND userId = ?');
    const insertBrandStmt = db.prepare(`
      INSERT INTO liquor_brands (id, name, category, specificGravity, userId)
      VALUES (?, ?, ?, ?, ?)
    `);
    const checkVariantStmt = db.prepare('SELECT id FROM liquor_variants WHERE brandId = ?');
    const insertVariantStmt = db.prepare(`
      INSERT INTO liquor_variants (id, brandId, sizeMl, containerType, emptyWeightGrams, fullWeightGrams, cost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const checkCountItemStmt = db.prepare(`
      SELECT id FROM physical_count_items 
      WHERE countId = ? AND brandId = ? AND variantId = ?
    `);
    const updateCountItemStmt = db.prepare(`
      UPDATE physical_count_items 
      SET qtyRaw = ?, qtyCalculatedOz = ? 
      WHERE id = ?
    `);
    const insertCountItemStmt = db.prepare(`
      INSERT INTO physical_count_items (id, countId, brandId, variantId, qtyRaw, isWeighted, qtyCalculatedOz)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);


    // Run transaction
    const transaction = db.transaction((items) => {
      for (const item of items) {
        // 1. Resolve or create liquor brand
        let brandRow = checkBrandStmt.get(item.name, user.id);
        let brandId = brandRow ? brandRow.id : null;
        if (!brandId) {
          brandId = crypto.randomUUID();
          // Wine, beer & soda density is approx 1.0, spirits 0.94
          const gravity = (isBeerOrSoda(item.category) || item.category.includes('WINE')) ? 1.0 : 0.94;
          insertBrandStmt.run(brandId, item.name, item.category, gravity, user.id);
        }

        // 2. Resolve or create variant (default 750ml glass bottle for wine, 355ml aluminum/glass for beer/soda)
        let variantRow = checkVariantStmt.get(brandId);
        let variantId = variantRow ? variantRow.id : null;
        if (!variantId) {
          variantId = crypto.randomUUID();
          const sizeMl = isBeerOrSoda(item.category) ? 355 : 750;
          // default weights (approximate values)
          const emptyG = isBeerOrSoda(item.category) ? 15 : 450;
          const fullG = emptyG + (sizeMl * 1.0); // approx
          insertVariantStmt.run(variantId, brandId, sizeMl, 'glass', emptyG, fullG, item.cost);
        }

        // 3. Add or update physical count item
        const qtyCalculatedOz = isBeerOrSoda(item.category)
          ? item.qty * 12.0 // 12 oz standard beer / soda
          : item.qty * (750 / 29.5735); // volume in oz per wine/liquor bottle


        const existingCountItem = checkCountItemStmt.get(countId, brandId, variantId);
        if (existingCountItem) {
          updateCountItemStmt.run(item.qty, parseFloat(qtyCalculatedOz.toFixed(2)), existingCountItem.id);
        } else {
          insertCountItemStmt.run(
            crypto.randomUUID(),
            countId,
            brandId,
            variantId,
            item.qty,
            0, // manual count, not weighted
            parseFloat(qtyCalculatedOz.toFixed(2))
          );
        }
      }
    });

    transaction(parsedItems);

    return NextResponse.json({
      success: true,
      countId,
      message: isNewSession 
        ? `Successfully processed and created physical count session for ${parsedItems.length} items.`
        : `Successfully processed and merged ${parsedItems.length} items into the existing session for ${countDate}.`,
      itemsCount: parsedItems.length,
      items: parsedItems.slice(0, 10)
    });


  } catch (error) {
    console.error('[Inventory Upload Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
