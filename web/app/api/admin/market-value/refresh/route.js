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
    let retryOnly = false;
    
    try {
      const body = await request.json();
      if (body.categoryId) {
        categoryId = body.categoryId;
      }
      if (body.retryOnly !== undefined) {
        retryOnly = !!body.retryOnly;
      }
    } catch (e) {
      // Body might be empty or invalid, proceed with defaults
    }

    const db = await getDb();
    let result;

    if (categoryId && categoryId !== 'all') {
      const categories = db.prepare('SELECT * FROM categories').all();
      const targetIds = getCategoryAndChildrenIds(categories, categoryId);

      if (targetIds.length > 0) {
        const placeholders = targetIds.map(() => '?').join(',');
        if (retryOnly) {
          result = db.prepare(`
            UPDATE items 
            SET syncStatus = 'pending_price_refresh' 
            WHERE syncStatus IN ('failed', 'rate_limited') 
              AND categoryId IN (${placeholders})
          `).run(...targetIds);
        } else {
          result = db.prepare(`
            UPDATE items 
            SET syncStatus = 'pending_price_refresh' 
            WHERE categoryId IN (${placeholders})
          `).run(...targetIds);
        }
      } else {
        result = { changes: 0 };
      }
    } else {
      if (retryOnly) {
        result = db.prepare(`
          UPDATE items 
          SET syncStatus = 'pending_price_refresh' 
          WHERE syncStatus IN ('failed', 'rate_limited')
        `).run();
      } else {
        result = db.prepare(`
          UPDATE items 
          SET syncStatus = 'pending_price_refresh'
        `).run();
      }
    }

    // Trigger the background queue processing loop
    triggerWorker();

    return NextResponse.json({
      success: true,
      message: `Successfully queued ${result.changes} items for market value refresh.`,
      queuedCount: result.changes
    });
  } catch (error) {
    console.error('Market value refresh trigger error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
