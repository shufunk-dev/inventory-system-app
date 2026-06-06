import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(request) {
  try {
    const { ids } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No item IDs provided' }, { status: 400 });
    }

    const db = await getDb();
    
    // Create placeholders for the query
    const placeholders = ids.map(() => '?').join(',');
    
    // Fetch image paths to clean them up from disk
    try {
      const items = db.prepare(`SELECT imagePath, imagePathBack FROM items WHERE id IN (${placeholders})`).all(...ids);
      const uploadsDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), 'uploads');
      
      for (const item of items) {
        // Front Image
        if (item.imagePath) {
          let filename = null;
          if (item.imagePath.startsWith('/api/file/')) {
            filename = item.imagePath.substring('/api/file/'.length);
          } else if (item.imagePath.startsWith('/uploads/')) {
            filename = item.imagePath.substring('/uploads/'.length);
          }
          if (filename) {
            const filePath = path.join(uploadsDir, filename);
            await fs.unlink(filePath).catch(() => {});
          }
        }
        // Back Image
        if (item.imagePathBack) {
          let filename = null;
          if (item.imagePathBack.startsWith('/api/file/')) {
            filename = item.imagePathBack.substring('/api/file/'.length);
          } else if (item.imagePathBack.startsWith('/uploads/')) {
            filename = item.imagePathBack.substring('/uploads/'.length);
          }
          if (filename) {
            const filePath = path.join(uploadsDir, filename);
            await fs.unlink(filePath).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('Failed to clean up image files during deletion:', err);
    }
    
    // Execute the deletion
    const info = db.prepare(`DELETE FROM items WHERE id IN (${placeholders})`).run(...ids);

    return NextResponse.json({ success: true, deletedCount: info.changes });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete items: ' + error.message }, { status: 500 });
  }
}
