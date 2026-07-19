import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request) {
  try {
    const body = await request.json();
    const { itemIds, movieFormat } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Item IDs are required' }, { status: 400 });
    }

    const db = await getDb();

    // Updating movieFormat also automatically sets itemType to 'movie' and triggers re-sync
    const updateStmt = db.prepare(`
      UPDATE items 
      SET movieFormat = ?, 
          itemType = 'movie', 
          valueLow = NULL, 
          valueAvg = NULL, 
          valueHigh = NULL, 
          syncStatus = 'pending' 
      WHERE id = ?
    `);

    const updateTransaction = db.transaction((ids, format) => {
      for (const id of ids) {
        updateStmt.run(format || null, id);
      }
    });

    updateTransaction(itemIds, movieFormat);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bulk Movie Format Update Error:', error);
    return NextResponse.json({ error: 'Failed to update movie format: ' + error.message }, { status: 500 });
  }
}
