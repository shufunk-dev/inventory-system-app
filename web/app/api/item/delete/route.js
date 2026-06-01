import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(request) {
  try {
    const { ids } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No item IDs provided' }, { status: 400 });
    }

    const db = getDb();
    
    // Create placeholders for the query
    const placeholders = ids.map(() => '?').join(',');
    
    // Execute the deletion
    const info = db.prepare(`DELETE FROM items WHERE id IN (${placeholders})`).run(...ids);

    return NextResponse.json({ success: true, deletedCount: info.changes });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete items: ' + error.message }, { status: 500 });
  }
}
