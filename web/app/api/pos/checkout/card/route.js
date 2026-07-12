import { getDb, getGlobalDb } from '../../../../../lib/db.js';
import { getUser } from '../../../../../lib/auth.js';
import { resolveTenantIdByEmail } from '../../../../../lib/dbManager.js';
import axios from 'axios';
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
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { amount, receiptNo, isTraining, provider } = await request.json();
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!receiptNo) {
      return NextResponse.json({ error: 'Receipt number is required' }, { status: 400 });
    }

    const db = await getDb();

    if (provider === 'venmo' || provider === 'paypal') {
      const txId = crypto.randomUUID();
      const refId = 'qr_' + crypto.randomBytes(4).toString('hex');
      
      db.prepare(`
        INSERT INTO payment_transactions (id, receiptNo, provider, providerCheckoutId, amount, status, isTraining, createdAt)
        VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)
      `).run(txId, receiptNo, provider, refId, amount, isTraining ? 1 : 0, Date.now());

      return NextResponse.json({
        success: true,
        transactionId: txId,
        provider,
        status: 'completed'
      });
    }

    if (isTraining) {
      const txId = crypto.randomUUID();
      const simCheckoutId = 'sim_' + crypto.randomBytes(4).toString('hex');
      
      db.prepare(`
        INSERT INTO payment_transactions (id, receiptNo, provider, providerCheckoutId, amount, status, isTraining, createdAt)
        VALUES (?, ?, 'simulated', ?, ?, 'pending', 1, ?)
      `).run(txId, receiptNo, simCheckoutId, amount, Date.now());

      return NextResponse.json({
        success: true,
        transactionId: txId,
        provider: 'simulated',
        providerCheckoutId: simCheckoutId
      });
    }

    const globalDb = await getGlobalDb();
    const row = globalDb.prepare("SELECT value FROM system_settings WHERE key = 'payment_config'").get();
    
    if (!row || !row.value) {
      return NextResponse.json({ error: 'Payment gateway integration is not configured' }, { status: 400 });
    }

    const config = JSON.parse(row.value);
    if (!config.provider || config.provider === 'none') {
      return NextResponse.json({ error: 'Card reader integration is disabled' }, { status: 400 });
    }

    let tenantId = '';
    if (process.env.SAAS_MODE === 'true') {
      tenantId = resolveTenantIdByEmail(user.email) || '';
    }

    const txId = crypto.randomUUID();
    let providerCheckoutId = null;

    if (config.provider === 'stripe') {
      if (!config.stripeApiKey || !config.stripeReaderId) {
        return NextResponse.json({ error: 'Stripe Terminal credentials missing in settings' }, { status: 400 });
      }

      // 1. Create PaymentIntent
      const amountInCents = Math.round(amount * 100);
      const piParams = new URLSearchParams({
        amount: amountInCents.toString(),
        currency: 'usd',
        'payment_method_types[]': 'card_present',
        capture_method: 'automatic'
      });
      
      if (tenantId) piParams.append('metadata[tenantId]', tenantId);
      piParams.append('metadata[txId]', txId);

      const piRes = await axios.post(
        'https://api.stripe.com/v1/payment_intents',
        piParams,
        {
          headers: {
            Authorization: `Bearer ${config.stripeApiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const paymentIntentId = piRes.data.id;

      // 2. Command Reader to process payment
      await axios.post(
        `https://api.stripe.com/v1/terminal/readers/${config.stripeReaderId}/process_payment_intent`,
        new URLSearchParams({
          payment_intent: paymentIntentId
        }),
        {
          headers: {
            Authorization: `Bearer ${config.stripeApiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      providerCheckoutId = paymentIntentId;

    } else if (config.provider === 'square') {
      if (!config.squareAccessToken || !config.squareDeviceId) {
        return NextResponse.json({ error: 'Square Terminal credentials missing in settings' }, { status: 400 });
      }

      // Command Square Terminal checkout
      const amountInCents = Math.round(amount * 100);
      const squareRes = await axios.post(
        'https://connect.squareup.com/v2/terminals/checkouts',
        {
          idempotency_key: crypto.randomUUID(),
          checkout: {
            amount_money: {
              amount: amountInCents,
              currency: 'USD'
            },
            device_id: config.squareDeviceId,
            reference_id: tenantId ? `${tenantId}:${txId}` : txId,
            deadline_duration: 'PT5M'
          }
        },
        {
          headers: {
            Authorization: `Bearer ${config.squareAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      providerCheckoutId = squareRes.data.checkout.id;
    }

    // Record the transaction locally in the store database
    db.prepare(`
      INSERT INTO payment_transactions (id, receiptNo, provider, providerCheckoutId, amount, status, createdAt)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(txId, receiptNo, config.provider, providerCheckoutId, amount, Date.now());

    return NextResponse.json({
      success: true,
      transactionId: txId,
      provider: config.provider,
      providerCheckoutId
    });

  } catch (err) {
    console.error('POS Checkout Card Payment Error:', err.response?.data || err.message);
    const apiError = err.response?.data?.error?.message || err.response?.data?.errors?.[0]?.detail || err.message;
    return NextResponse.json({ error: `Terminal Checkout Failed: ${apiError}` }, { status: 500 });
  }
}
