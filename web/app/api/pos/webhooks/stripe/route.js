import { getTenantDb } from '../../../../../lib/dbManager.js';
import { getMasterDb } from '../../../../../lib/db.js';
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
    const payload = await request.json();
    const eventType = payload.type;
    
    if (eventType === 'payment_intent.succeeded' || eventType === 'payment_intent.payment_failed') {
      const intent = payload.data.object;
      const tenantId = intent.metadata?.tenantId;
      const txId = intent.metadata?.txId;
      
      if (!txId) {
        return NextResponse.json({ received: true, ignored: 'Missing transaction metadata' });
      }

      // Resolve database connection
      const db = (process.env.SAAS_MODE === 'true' && tenantId)
        ? getTenantDb(tenantId)
        : getMasterDb();

      const newStatus = eventType === 'payment_intent.succeeded' ? 'completed' : 'failed';

      const updateResult = db.prepare('UPDATE payment_transactions SET status = ? WHERE id = ?').run(newStatus, txId);
      
      console.log(`[Stripe Webhook] Updated transaction ${txId} to ${newStatus}. Rows affected: ${updateResult.changes}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook Error]:', err.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
