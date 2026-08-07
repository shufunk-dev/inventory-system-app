import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

async function checkAdmin() {
  const user = await getUser();
  return user && (user.isAdmin || user.isRoot);
}

export async function POST(request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { discordWebhookUrl } = await request.json();

    if (!discordWebhookUrl || !discordWebhookUrl.trim()) {
      return NextResponse.json({ error: 'Discord Webhook URL is required.' }, { status: 400 });
    }

    const testPayload = {
      username: "Inventory System - eBay Relay",
      avatar_url: "https://raw.githubusercontent.com/shufunk-dev/inventory-system-app/master/public/icon.png",
      embeds: [
        {
          title: "🔔 Discord Webhook Relayer Connected!",
          description: "Your Discord webhook is configured and operational. Incoming eBay Account Deletion Notifications will automatically relay to this channel.",
          color: 0x3b82f6, // Blue
          fields: [
            { name: "Status", value: "✅ Operational", inline: true },
            { name: "Relay Service", value: "eBay Deletion Webhook", inline: true }
          ],
          footer: { text: "Inventory System App • eBay Compliance Relay" },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await fetch(discordWebhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Discord API returned HTTP ${res.status}: ${errText}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Test message sent to Discord successfully!' });
  } catch (error) {
    console.error('Discord Webhook test error:', error);
    return NextResponse.json({ error: 'Failed to connect to Discord Webhook: ' + error.message }, { status: 500 });
  }
}
