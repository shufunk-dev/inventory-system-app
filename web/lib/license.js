import crypto from 'crypto';
import { getMachineId } from './machine.js';
import axios from 'axios';
import os from 'os';

const DEFAULT_TRIAL_SALT = 'shufunk-inventory-system-secret-salt-2026';

// Map key prefixes to license types
const PREFIX_MAP = {
  'COLL': 'collector', // Type A
  'STOR': 'store',     // Type B
  'UPGR': 'upgrade',   // Type C
  'TRIA': 'trial',     // 7-Day Trial
  'TR5M': 'trial_5m'   // 5-Minute Trial for Testing
};

/**
 * Resolves the salt to use based on the key prefix and environment.
 */
function getLicenseSalt(prefix) {
  const licenseSalt = process.env.LICENSE_SALT;
  if (licenseSalt) {
    return licenseSalt;
  }

  // Fallback behavior when LICENSE_SALT is not set in the environment:
  if (prefix === 'TRIA' || prefix === 'TR5M') {
    // Trial keys can use the default/public salt so that trials work out of the box
    return DEFAULT_TRIAL_SALT;
  }

  if (process.env.NODE_ENV === 'test') {
    // Tests are allowed to fall back to the default salt to pass without extra environment config
    return DEFAULT_TRIAL_SALT;
  }

  // Reject with null if trying to validate/generate permanent keys without LICENSE_SALT set
  return null;
}

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

  const licenseSalt = getLicenseSalt(prefix);
  if (!licenseSalt) {
    return { isValid: false, type: null };
  }

  // Re-generate the expected signature hash
  const dataToHash = `${prefix}-${salt}-${licenseSalt}`;
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
 * Optional identifier (e.g., invoice ID) can be provided as salt.
 */
export function generateLicenseKey(type, identifier = null) {
  const prefix = Object.keys(PREFIX_MAP).find(key => PREFIX_MAP[key] === type);
  if (!prefix) {
    throw new Error(`Invalid license type: ${type}`);
  }

  const licenseSalt = getLicenseSalt(prefix);
  if (!licenseSalt) {
    throw new Error(`FATAL: LICENSE_SALT environment variable is required to generate permanent '${type}' license keys.`);
  }

  // Use clean alphanumeric identifier or fallback to random 4-digit serial
  const salt = identifier
    ? identifier.toUpperCase().trim().replace(/[^A-Z0-9]/g, '')
    : Math.floor(1000 + Math.random() * 9000).toString();
  
  const dataToHash = `${prefix}-${salt}-${licenseSalt}`;
  const fullHash = crypto.createHash('sha256').update(dataToHash).digest('hex').toUpperCase();
  
  const hash1 = fullHash.substring(0, 4);
  const hash2 = fullHash.substring(4, 8);

  return `${prefix}-${salt}-${hash1}-${hash2}`;
}

/**
 * Sends a license activation request to the central server.
 */
export async function activateLicenseOnServer(key, serverUrl = 'https://licensing.shufeltdesigns.com') {
  try {
    const machineId = getMachineId();
    const hostname = os.hostname();
    const username = os.userInfo().username;
    
    const response = await axios.post(`${serverUrl}/api/license/activate`, {
      licenseKey: key,
      machineId,
      hostname,
      username
    });
    return response.data;
  } catch (err) {
    if (err.response && err.response.data) {
      return { success: false, error: err.response.data.error || 'Server rejected activation.' };
    }
    return { success: false, error: err.message };
  }
}

/**
 * Sends a device deactivation request to the central server.
 */
export async function deactivateDeviceOnServer(key, machineIdToRemove, serverUrl = 'https://licensing.shufeltdesigns.com') {
  try {
    const response = await axios.post(`${serverUrl}/api/license/deactivate-device`, {
      licenseKey: key,
      machineIdToRemove
    });
    return response.data;
  } catch (err) {
    if (err.response && err.response.data) {
      return { success: false, error: err.response.data.error || 'Server rejected deactivation.' };
    }
    return { success: false, error: err.message };
  }
}
