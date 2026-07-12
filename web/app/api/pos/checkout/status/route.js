import { getDb, getGlobalDb } from '../../../../../lib/db.js';
import { getUser } from '../../../../../lib/auth.js';
import axios from 'axios';
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

export async function GET(request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const txId = searchParams.get('id');

    if (!txId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const tx = db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(txId);

    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // If already finalized, return cached status
    if (tx.status !== 'pending') {
      return NextResponse.json({ status: tx.status });
    }

    if (tx.provider === 'simulated') {
      const elapsed = Date.now() - tx.createdAt;
      let currentStatus = 'pending';
      if (elapsed >= 3000) {
        currentStatus = 'completed';
        db.prepare("UPDATE payment_transactions SET status = 'completed' WHERE id = ?").run(txId);
      }
      return NextResponse.json({ status: currentStatus });
    }

    const globalDb = await getGlobalDb();
    const row = globalDb.prepare("SELECT value FROM system_settings WHERE key = 'payment_config'").get();
    if (!row || !row.value) {
      return NextResponse.json({ error: 'Payment gateway configuration missing' }, { status: 400 });
    }

    const config = JSON.parse(row.value);
    let currentStatus = 'pending';

    if (tx.provider === 'stripe') {
      const piRes = await axios.get(
        `https://api.stripe.com/v1/payment_intents/${tx.providerCheckoutId}`,
        {
          headers: {
            Authorization: `Bearer ${config.stripeApiKey}`
          }
        }
      );

      const stripeStatus = piRes.data.status;
      if (stripeStatus === 'succeeded') {
        currentStatus = 'completed';
      } else if (stripeStatus === 'canceled') {
        currentStatus = 'canceled';
      } else if (stripeStatus === 'requires_payment_method') {
        // Handled as failed if reader timed out or rejected
        if (piRes.data.last_payment_error) {
          currentStatus = 'failed';
        }
      }
    } else if (tx.provider === 'square') {
      const squareRes = await axios.get(
        `https://connect.squareup.com/v2/terminals/checkouts/${tx.providerCheckoutId}`,
        {
          headers: {
            Authorization: `Bearer ${config.squareAccessToken}`
          }
        }
      );

      const squareStatus = squareRes.data.checkout.status;
      if (squareStatus === 'COMPLETED') {
        currentStatus = 'completed';
      } else if (squareStatus === 'CANCELED') {
        currentStatus = 'canceled';
      } else if (squareStatus === 'FAILED') {
        currentStatus = 'failed';
      }
    }

    // Update state if changed
    if (currentStatus !== 'pending') {
      db.prepare('UPDATE payment_transactions SET status = ? WHERE id = ?').run(currentStatus, txId);
    }

    return NextResponse.json({ status: currentStatus });

  } catch (err) {
    console.error('POS Checkout Status Polling Error:', err.response?.data || err.message);
    return NextResponse.json({ error: 'Failed to poll transaction status' }, { status: 500 });
  }
}
