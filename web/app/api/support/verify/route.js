import { NextResponse } from 'next/server';
import { verifySupportToken } from '../../../../lib/supportToken.js';
import { createSupportSession } from '../../../../lib/auth.js';

export async function POST(req) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Support token is required.' }, { status: 400 });
    }

    const payload = await verifySupportToken(token);
    
    // Calculate remaining expiration time from the token
    const expiresAt = new Date(payload.exp * 1000);
    
    await createSupportSession(payload.supportEmail, payload.supportName, expiresAt);
    
    console.log(`[SUPPORT] Ephemeral support access granted to ${payload.supportName} (${payload.supportEmail}) until ${expiresAt.toISOString()}`);
    
    return NextResponse.json({ success: true, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error('[SUPPORT] Failed to verify support token:', err.message);
    return NextResponse.json({ error: err.message || 'Verification failed.' }, { status: 401 });
  }
}
