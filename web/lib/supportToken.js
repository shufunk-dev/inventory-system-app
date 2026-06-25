import { jwtVerify, importSPKI } from 'jose';
import { getMachineId } from './machine.js';

// NIST P-256 Public Key PEM
const SUPPORT_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBNIet/dA3842tWAsSFOXWGrwYKkp
anW6nJ1AKkiPRRRi0aQWoMz5iKwr7AOcMD+C1h0NBia/P8W/D+7dX6ZUZw==
-----END PUBLIC KEY-----`;

let importedPublicKey = null;

async function getPublicKey() {
  if (!importedPublicKey) {
    importedPublicKey = await importSPKI(SUPPORT_PUBLIC_KEY_PEM, 'ES256');
  }
  return importedPublicKey;
}

/**
 * Cryptographically verifies a support token.
 * Validates:
 * 1. Signature against the hardcoded Public Key.
 * 2. Expiration (exp) and Not-Before (nbf) timestamps.
 * 3. Machine ID mapping matches the local machine.
 * 
 * @param {string} token - The JWS/JWT string to verify.
 * @returns {Promise<object>} The validated payload content.
 */
export async function verifySupportToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Support token must be a non-empty string.');
  }

  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['ES256']
    });

    // Check machine binding
    const currentMachineId = getMachineId();
    if (!payload.machineId || payload.machineId !== currentMachineId) {
      throw new Error('Support token is not valid for this system (Machine ID mismatch).');
    }

    return payload;
  } catch (err) {
    if (err.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Support token has expired.');
    }
    if (err.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      throw new Error(`Support token validation failed: ${err.message}`);
    }
    throw new Error(err.message || 'Invalid support token signature.');
  }
}
