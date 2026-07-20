import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { triggerWorker } from '@/lib/worker';

export async function POST(request) {
  try {
    const { itemIds } = await request.json();

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    const db = await getDb();
    const placeholders = itemIds.map(() => '?').join(',');
    const query = `UPDATE items SET syncStatus = 'pending' WHERE id IN (${placeholders})`;

    const result = db.prepare(query).run(...itemIds);

    // Trigger background worker for full identification
    triggerWorker();

    return NextResponse.json({
      success: true,
      message: `Queued ${result.changes} item(s) for full AI identification.`,
      count: result.changes
    });
  } catch (error) {
    console.error('Bulk Identify Error:', error);
    return NextResponse.json({ error: 'Failed to queue bulk identification: ' + error.message }, { status: 500 });
  }
}
