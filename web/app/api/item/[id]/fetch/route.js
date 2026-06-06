import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { fetchItemDetails } from '@/lib/worker';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    
    // Attempt to read body, but don't fail if empty
    let forceTier = null;
    try {
      const body = await request.json();
      forceTier = body.forceTier;
    } catch (e) {}

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Synchronously fetch and wait for result
    const result = await fetchItemDetails(item, db, { forceTier });

    if (result.success) {
      return NextResponse.json({ success: true, status: 'success' });
    } else {
      return NextResponse.json({ success: false, status: 'failed', reason: result.reason });
    }
  } catch (error) {
    console.error('Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to trigger fetch: ' + error.message }, { status: 500 });
  }
}
