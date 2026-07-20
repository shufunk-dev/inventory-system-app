import { getDb } from '../../../../../lib/db.js';
import { getUser } from '../../../../../lib/auth.js';
import { getCategoryAndChildrenIds } from '../../../../../lib/categories.js';
import { triggerWorker } from '../../../../../lib/worker.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

export async function POST(request) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let categoryId = 'all';
    let unknownOnly = false;
    let retryOnly = false;

    try {
      const body = await request.json();
      if (body.categoryId) categoryId = body.categoryId;
      if (body.unknownOnly !== undefined) unknownOnly = !!body.unknownOnly;
      if (body.retryOnly !== undefined) retryOnly = !!body.retryOnly;
    } catch (e) {
      // Body optional
    }

    const db = await getDb();
    let result;

    const unknownCondition = "(name IS NULL OR name = '' OR name = 'Unknown Item' OR name = 'Unknown Item (Needs Review)' OR syncStatus IN ('failed', 'rate_limited'))";

    if (categoryId && categoryId !== 'all') {
      const categories = db.prepare('SELECT * FROM categories').all();
      const targetIds = getCategoryAndChildrenIds(categories, categoryId);

      if (targetIds.length > 0) {
        const placeholders = targetIds.map(() => '?').join(',');
        if (unknownOnly || retryOnly) {
          result = db.prepare(`
            UPDATE items 
            SET syncStatus = 'pending' 
            WHERE categoryId IN (${placeholders}) AND ${unknownCondition}
          `).run(...targetIds);
        } else {
          result = db.prepare(`
            UPDATE items 
            SET syncStatus = 'pending' 
            WHERE categoryId IN (${placeholders})
          `).run(...targetIds);
        }
      } else {
        result = { changes: 0 };
      }
    } else {
      if (unknownOnly || retryOnly) {
        result = db.prepare(`
          UPDATE items 
          SET syncStatus = 'pending' 
          WHERE ${unknownCondition}
        `).run();
      } else {
        result = db.prepare(`
          UPDATE items 
          SET syncStatus = 'pending'
        `).run();
      }
    }

    // Trigger the background worker queue loop for object identification
    triggerWorker();

    return NextResponse.json({
      success: true,
      message: `Successfully queued ${result.changes} items for full AI identification.`,
      queuedCount: result.changes
    });
  } catch (error) {
    console.error('Identification queue trigger error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
