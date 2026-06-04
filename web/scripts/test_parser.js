function cleanNumber(str) {
  if (!str) return NaN;
  let cleaned = str.replace(/[^0-9.]/g, '');
  cleaned = cleaned.replace(/^\.+/, '').replace(/\.+$/, '');
  const val = parseFloat(cleaned);
  return val;
}

function getBeerDistributor(name) {
  const lower = name.toLowerCase();
  if (/budweiser|bud\s+light|stella|michelob|corona/i.test(lower)) {
    return 'Barringer';
  }
  return 'Caffey';
}

function parseLine(line, sectionCategory = 'UNKNOWN') {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let tokens = trimmed.split(/[\s|]+/).map(t => t.trim()).filter(t => t.length > 0);
  if (tokens.length < 2) return null;

  // Find numeric tokens (ignoring vintage years 1900-2099 and item IDs of 5 to 8 digits)
  let numIndices = [];
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

  if (numIndices.length < 2) return null;

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

  const activeCategory = itemCategory || sectionCategory;

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

  if (!name || name === 'TOTAL' || name === 'SUBTOTAL' || /^\$?\d+(\.\d+)?$/.test(name)) return null;

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
      if (Math.abs(cost / calculatedCost - 100) < 5 || Math.abs(cost / calculatedCost - 10) < 5 || Math.abs(cost / calculatedCost - 1000) < 5) {
        cost = parseFloat(calculatedCost.toFixed(2));
      } else if (Math.abs(expectedTotal / total - 100) < 5 || Math.abs(expectedTotal / total - 10) < 5) {
        total = parseFloat(expectedTotal.toFixed(2));
      } else if (calculatedCost > 0 && calculatedCost < 500) {
        cost = parseFloat(calculatedCost.toFixed(2));
      }
    }
  }

  return { name, category: finalCategory, qty, cost, total };
}

// Test cases
const testCases = [
  { line: "$21.63 4 Bud Light $86.52", activeCategory: "Barringer" },
  { line: "$21.63 0.25 Miller Light $5.41", activeCategory: "Caffey" },
  { line: "Pepsi 1.6 64.95 $103.92", activeCategory: "Pepsi Co" },
  { line: "$21.63 1 Budweiser $21.63", activeCategory: "Barringer" },
  { line: "$22.35 0.92 Yuengling $20.56", activeCategory: "Caffey" },
  { line: "Ginger Ale 4 66.75 $267.00", activeCategory: "Pepsi Co" }
];

testCases.forEach(tc => {
  console.log(`\nInput:  "${tc.line}" (Active Category: ${tc.activeCategory})`);
  console.log('Parsed:', parseLine(tc.line, tc.activeCategory));
});
