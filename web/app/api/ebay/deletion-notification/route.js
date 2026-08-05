import crypto from 'crypto';
import { getGlobalDb } from '../../../../lib/db.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let NextResponse;
try {
  const nextServer = require('next/server');
  NextResponse = nextServer.NextResponse;
} catch (e) {
  NextResponse = {
    json: (body, init) => ({
      status: init?.status || 200,
      json: async () => body
    })
  };
}

/**
 * Retrieves configured eBay Verification Token from system_settings or env.
 */
async function getEbayVerificationToken() {
  try {
    const db = await getGlobalDb();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'api_keys'").get();
    if (row && row.value) {
      const apiKeys = JSON.parse(row.value);
      if (apiKeys.ebayVerificationToken) {
        return apiKeys.ebayVerificationToken.trim();
      }
    }
  } catch (e) {
    console.warn('[eBay Deletion Webhook] Failed to fetch token from DB:', e.message);
  }
  return (process.env.EBAY_VERIFICATION_TOKEN || '').trim();
}

/**
 * GET Handler for eBay Verification Challenge
 * eBay issues GET request with ?challenge_code=...
 * Responds with SHA-256 hash of challengeCode + verificationToken + endpointUrl
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const challengeCode = url.searchParams.get('challenge_code');

    if (!challengeCode) {
      return NextResponse.json({ error: 'Missing challenge_code query parameter.' }, { status: 400 });
    }

    const verificationToken = await getEbayVerificationToken();
    if (!verificationToken) {
      console.warn('[eBay Deletion Webhook] Verification token not configured.');
      return NextResponse.json({ error: 'eBay verification token is not configured on this server.' }, { status: 500 });
    }

    // Determine configured endpoint URL (strip search params)
    // Account for reverse proxies / tunnels (e.g. ngrok, Vercel, Cloudflare)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    let proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    if (proto.endsWith(':')) proto = proto.slice(0, -1);
    const endpointUrl = `${proto}://${host}${url.pathname}`;

    // Compute SHA-256 hash according to eBay specification:
    // SHA256( challenge_code + verification_token + endpoint_url )
    const hash = crypto.createHash('sha256');
    hash.update(challengeCode);
    hash.update(verificationToken);
    hash.update(endpointUrl);
    const challengeResponse = hash.digest('hex');

    return NextResponse.json({ challengeResponse }, { status: 200 });
  } catch (error) {
    console.error('[eBay Deletion Webhook] Verification GET error:', error);
    return NextResponse.json({ error: 'Internal server error processing eBay challenge.' }, { status: 500 });
  }
}

/**
 * POST Handler for eBay Account Deletion Notification Webhook
 * eBay sends notification payload when account deletion is requested.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[eBay Deletion Notification Received]', JSON.stringify(body, null, 2));

    // Acknowledge receipt of deletion notification with HTTP 200 OK
    return NextResponse.json(
      {
        status: 'success',
        message: 'Account deletion notification received and logged.'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[eBay Deletion Webhook] Notification POST error:', error);
    return NextResponse.json({ error: 'Failed to process notification body.' }, { status: 400 });
  }
}
