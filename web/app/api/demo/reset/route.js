import { NextResponse } from 'next/server';
import { seedDemoData } from '../../../../lib/seedDemoData.js';
import { closeAllConnections } from '../../../../lib/dbManager.js';
import { closeDb } from '../../../../lib/db.js';

export async function POST(request) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo mode is not enabled on this instance.' }, { status: 403 });
  }

  try {
    closeAllConnections();
    closeDb();
    const result = seedDemoData();
    return NextResponse.json({
      success: true,
      message: 'Demo dataset cleanly re-seeded with 3 booths, sample inventory, and sales history.',
      details: result
    });
  } catch (error) {
    console.error('Error during demo reset API trigger:', error);
    return NextResponse.json({ error: 'Failed to reset demo data.' }, { status: 500 });
  }
}

export async function GET() {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo mode is not enabled on this instance.' }, { status: 403 });
  }

  try {
    closeAllConnections();
    closeDb();
    const result = seedDemoData();
    return NextResponse.json({
      success: true,
      message: 'Demo dataset cleanly re-seeded with 3 booths, sample inventory, and sales history.',
      details: result
    });
  } catch (error) {
    console.error('Error during demo reset API trigger:', error);
    return NextResponse.json({ error: 'Failed to reset demo data.' }, { status: 500 });
  }
}
