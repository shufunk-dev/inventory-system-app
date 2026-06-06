import crypto from 'crypto';

// Helper to decode Base32 strings to buffers
function base32Decode(base32Str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanStr = base32Str.toUpperCase().replace(/=+$/, '');
  let bits = '';

  for (let i = 0; i < cleanStr.length; i++) {
    const val = alphabet.indexOf(cleanStr[i]);
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8), 2);
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 secret key and an otpauth URI for QR code setup.
 * @param {string} email - User email address
 * @param {string} issuer - Identity provider name
 */
export function generateSecret(email = 'user@system.com', issuer = 'InventorySystem') {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const randomBytes = crypto.randomBytes(10); // 80 bits of entropy
  let secret = '';
  for (let i = 0; i < randomBytes.length; i++) {
    secret += alphabet[randomBytes[i] % 32];
  }
  
  const label = encodeURIComponent(`${issuer}:${email}`);
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  
  return { secret, otpauthUrl };
}

/**
 * Verifies a 6-digit time-based one-time password code.
 * @param {string} secret - The user's saved base32 secret
 * @param {string} token - The 6-digit user input token
 * @param {number} window - Time window allowance (+/- steps of 30 seconds)
 */
export function verifyToken(secret, token, window = 1) {
  if (!secret || !token) return false;
  
  const cleanToken = token.replace(/\s+/g, '');
  if (cleanToken.length !== 6 || isNaN(cleanToken)) return false;

  let key;
  try {
    key = base32Decode(secret);
  } catch (e) {
    console.error('TOTP secret decoding failed:', e);
    return false;
  }

  const timeStep = 30; // RFC 6238 standard step
  const currentEpoch = Math.floor(Date.now() / 1000);
  const currentTimeStep = Math.floor(currentEpoch / timeStep);

  for (let i = -window; i <= window; i++) {
    const timeStepToVerify = currentTimeStep + i;
    
    // Create 8-byte message buffer representing time step
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(0, 0); // High 32-bits (unused for time steps in our lifetime)
    buf.writeUInt32BE(timeStepToVerify, 4); // Low 32-bits

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buf);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const binary = ((hmacResult[offset] & 0x7f) << 24) |
                   ((hmacResult[offset + 1] & 0xff) << 16) |
                   ((hmacResult[offset + 2] & 0xff) << 8) |
                   (hmacResult[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    
    if (otp === cleanToken) {
      return true;
    }
  }

  return false;
}
