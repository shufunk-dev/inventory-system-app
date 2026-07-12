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

    if (eventType === 'terminal.checkout.updated') {
      const checkout = payload.data.object.terminal_checkout;
      const ref = checkout.reference_id || '';
      
      let tenantId = null;
      let txId = ref;
      
      if (ref.includes(':')) {
        const parts = ref.split(':');
        tenantId = parts[0];
        txId = parts[1];
      }

      if (!txId) {
        return NextResponse.json({ received: true, ignored: 'Missing transaction ID' });
      }

      // Resolve database connection
      const db = (process.env.SAAS_MODE === 'true' && tenantId)
        ? getTenantDb(tenantId)
        : getMasterDb();

      let newStatus = 'pending';
      const squareStatus = checkout.status;

      if (squareStatus === 'COMPLETED') {
        newStatus = 'completed';
      } else if (squareStatus === 'CANCELED') {
        newStatus = 'canceled';
      } else if (squareStatus === 'FAILED') {
        newStatus = 'failed';
      }

      if (newStatus !== 'pending') {
        const updateResult = db.prepare('UPDATE payment_transactions SET status = ? WHERE id = ?').run(newStatus, txId);
        console.log(`[Square Webhook] Updated transaction ${txId} to ${newStatus}. Rows affected: ${updateResult.changes}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Square Webhook Error]:', err.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
