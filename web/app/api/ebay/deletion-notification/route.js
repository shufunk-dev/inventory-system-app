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
 * Retrieves configured Discord Webhook URL from system_settings or env.
 */
async function getDiscordWebhookUrl() {
  try {
    const db = await getGlobalDb();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'api_keys'").get();
    if (row && row.value) {
      const apiKeys = JSON.parse(row.value);
      if (apiKeys.discordWebhookUrl) {
        return apiKeys.discordWebhookUrl.trim();
      }
    }
  } catch (e) {
    console.warn('[eBay Deletion Webhook] Failed to fetch Discord webhook URL from DB:', e.message);
  }
  return (process.env.DISCORD_WEBHOOK_URL || '').trim();
}

/**
 * Relays eBay Account Deletion Notification payload to Discord channel via Webhook
 */
async function relayToDiscord(payload, webhookUrl) {
  if (!webhookUrl) return;

  try {
    const metadata = payload?.metadata || {};
    const notificationId = metadata.notificationId || payload?.notificationId || 'N/A';
    const eventType = metadata.topic || payload?.eventType || 'ACCOUNT_DELETION_NOTIFICATION';
    const userId = payload?.data?.userId || payload?.data?.username || payload?.userId || 'N/A';
    const timestamp = payload?.eventDate || new Date().toISOString();

    const embedPayload = {
      username: "Inventory System - eBay Relay",
      avatar_url: "https://raw.githubusercontent.com/shufunk-dev/inventory-system-app/master/public/icon.png",
      embeds: [
        {
          title: "⚠️ eBay Account Deletion Notification Received",
          description: "An official eBay Account Deletion / Closure Notification was received by your application webhook.",
          color: 0xef4444, // Red alert
          fields: [
            { name: "Event Type", value: `\`${eventType}\``, inline: true },
            { name: "User / Account ID", value: `\`${userId}\``, inline: true },
            { name: "Notification ID", value: `\`${notificationId}\``, inline: false },
            { name: "Received Timestamp", value: timestamp, inline: true }
          ],
          footer: { text: "Inventory System App • eBay Compliance Relay" },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embedPayload)
    });

    if (res.ok) {
      console.log('[eBay Deletion Webhook] Successfully relayed notification to Discord.');
    } else {
      console.warn(`[eBay Deletion Webhook] Discord relay HTTP ${res.status}:`, await res.text());
    }
  } catch (err) {
    console.error('[eBay Deletion Webhook] Failed to relay message to Discord:', err.message);
  }
}

/**
 * POST Handler for eBay Account Deletion Notification Webhook
 * eBay sends notification payload when account deletion is requested.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[eBay Deletion Webhook] Received notification POST payload:', JSON.stringify(body));

    // Relay notification payload asynchronously to Discord if configured
    const discordWebhookUrl = await getDiscordWebhookUrl();
    if (discordWebhookUrl) {
      relayToDiscord(body, discordWebhookUrl);
    }

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
