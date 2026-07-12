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

export async function POST(request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const tx = db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(id);

    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (tx.status !== 'pending') {
      return NextResponse.json({ success: true, status: tx.status });
    }

    if (tx.provider === 'simulated') {
      db.prepare("UPDATE payment_transactions SET status = 'canceled' WHERE id = ?").run(id);
      return NextResponse.json({ success: true, status: 'canceled' });
    }

    const globalDb = await getGlobalDb();
    const row = globalDb.prepare("SELECT value FROM system_settings WHERE key = 'payment_config'").get();
    if (!row || !row.value) {
      return NextResponse.json({ error: 'Payment configuration missing' }, { status: 400 });
    }

    const config = JSON.parse(row.value);

    if (tx.provider === 'stripe') {
      // 1. Cancel active reader screen action
      try {
        await axios.post(
          `https://api.stripe.com/v1/terminal/readers/${config.stripeReaderId}/cancel_action`,
          null,
          {
            headers: {
              Authorization: `Bearer ${config.stripeApiKey}`
            }
          }
        );
      } catch (cancelErr) {
        console.warn('Stripe Reader cancel_action warning:', cancelErr.response?.data || cancelErr.message);
      }

      // 2. Cancel the PaymentIntent
      try {
        await axios.post(
          `https://api.stripe.com/v1/payment_intents/${tx.providerCheckoutId}/cancel`,
          null,
          {
            headers: {
              Authorization: `Bearer ${config.stripeApiKey}`
            }
          }
        );
      } catch (piErr) {
        console.warn('Stripe PaymentIntent cancel warning:', piErr.response?.data || piErr.message);
      }

    } else if (tx.provider === 'square') {
      // Cancel Square Terminal Checkout request
      await axios.post(
        `https://connect.squareup.com/v2/terminals/checkouts/${tx.providerCheckoutId}/cancel`,
        null,
        {
          headers: {
            Authorization: `Bearer ${config.squareAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Update local database status
    db.prepare("UPDATE payment_transactions SET status = 'canceled' WHERE id = ?").run(id);

    return NextResponse.json({ success: true, status: 'canceled' });

  } catch (err) {
    console.error('POS Checkout Cancel Error:', err.response?.data || err.message);
    const apiError = err.response?.data?.error?.message || err.response?.data?.errors?.[0]?.detail || err.message;
    return NextResponse.json({ error: `Failed to cancel card checkout: ${apiError}` }, { status: 500 });
  }
}
