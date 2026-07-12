import { validateLicenseKey } from '../../../../lib/license.js';
import crypto from 'crypto';
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

export async function POST(request) {
  try {
    const { licenseKey, machineId, hostname, username } = await request.json();

    if (!licenseKey) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 });
    }

    const verification = validateLicenseKey(licenseKey);
    if (!verification.isValid) {
      return NextResponse.json({ error: 'Invalid license key signature.' }, { status: 400 });
    }

    // Simulate Cloudflare Dynamic Tunnel Token & Subdomain Creation
    const keyHash = crypto.createHash('md5').update(licenseKey).digest('hex').substring(0, 8);
    const subdomain = `https://${keyHash}-sync.shufunk.com`;
    
    // Construct a simulated Cloudflare tunnel token (B64 JSON)
    const mockTokenObj = {
      a: "11d43c08f1c93a02bb84841fdfdfb61c",
      t: crypto.randomUUID(),
      s: crypto.createHash('sha256').update(machineId || 'fallback').digest('hex')
    };
    const token = Buffer.from(JSON.stringify(mockTokenObj)).toString('base64');

    return NextResponse.json({
      success: true,
      subdomain,
      token,
      tier: verification.type,
      activeUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days active
    });

  } catch (err) {
    console.error('SaaS Central Server License Activation Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
