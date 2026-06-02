import crypto from 'crypto';

const LICENSE_SALT = process.env.LICENSE_SALT || 'shufunk-inventory-system-secret-salt-2026';

// Map key prefixes to license types
const PREFIX_MAP = {
  'COLL': 'collector', // Type A
  'STOR': 'store',     // Type B
  'UPGR': 'upgrade'    // Type C
};

/**
 * Validates a license key offline.
 * Key format: PREFIX-SALT-HASH1-HASH2 (e.g. COLL-8472-F9B2-A8E1)
 */
export function validateLicenseKey(key) {
  if (!key || typeof key !== 'string') {
    return { isValid: false, type: null };
  }

  const cleanKey = key.toUpperCase().trim().replace(/\s/g, '');
  const parts = cleanKey.split('-');
  
  if (parts.length !== 4) {
    return { isValid: false, type: null };
  }

  const [prefix, salt, hash1, hash2] = parts;
  
  const type = PREFIX_MAP[prefix];
  if (!type) {
    return { isValid: false, type: null };
  }

  // Re-generate the expected signature hash
  const dataToHash = `${prefix}-${salt}-${LICENSE_SALT}`;
  const fullHash = crypto.createHash('sha256').update(dataToHash).digest('hex').toUpperCase();
  
  // Extract segments of the hash to match Segment 3 and 4 of the license key
  const expectedHash1 = fullHash.substring(0, 4);
  const expectedHash2 = fullHash.substring(4, 8);

  const isValid = (hash1 === expectedHash1 && hash2 === expectedHash2);

  return { isValid, type: isValid ? type : null };
}

/**
 * Generates a valid offline license key for a given type.
 * Type must be: 'collector' | 'store' | 'upgrade'
 */
export function generateLicenseKey(type) {
  const prefix = Object.keys(PREFIX_MAP).find(key => PREFIX_MAP[key] === type);
  if (!prefix) {
    throw new Error(`Invalid license type: ${type}`);
  }

  // Generate a random 4-digit serial/salt segment
  const salt = Math.floor(1000 + Math.random() * 9000).toString();
  
  const dataToHash = `${prefix}-${salt}-${LICENSE_SALT}`;
  const fullHash = crypto.createHash('sha256').update(dataToHash).digest('hex').toUpperCase();
  
  const hash1 = fullHash.substring(0, 4);
  const hash2 = fullHash.substring(4, 8);

  return `${prefix}-${salt}-${hash1}-${hash2}`;
}
