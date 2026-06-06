import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

const secretKey = process.env.SESSION_SECRET || 'super-secret-key-for-development';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function encryptTemp(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

export async function decrypt(input) {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Synchronously decrypts/verifies an HS256 JWT token.
 * This is critical to allow getDb() to resolve tenant IDs synchronously.
 */
export function decryptSync(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Verify signature using Node's native synchronous crypto module
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(`${headerB64}.${payloadB64}`);
    
    // Base64url digest to match JWT standard
    const expectedSignature = hmac.digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, ''); // Trim padding to match base64url
      
    if (signatureB64 !== expectedSignature) {
      return null;
    }
    
    // Decode the payload
    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    
    // Verify expiration time
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error('[jwt] decryptSync error:', err);
    return null;
  }
}
