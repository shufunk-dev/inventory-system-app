import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { triggerWorker } from '@/lib/worker';
import { getUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const categoryId = formData.get('categoryId') || null;
    const itemType = formData.get('itemType') || 'standard';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const id = crypto.randomUUID();
    
    // Attempt to keep original extension if possible, fallback to jpg
    const originalName = file.name || '';
    const ext = path.extname(originalName) || '.jpg';
    const filename = `${id}${ext}`;
    const imagePath = `/api/file/${filename}`;
    
    // Save file
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    const db = getDb();
    
    // Create new item in pending state
    db.prepare(`
      INSERT INTO items (id, userId, categoryId, name, itemType, imagePath, syncStatus, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      user.id,
      categoryId,
      'Analyzing Photo...',
      itemType,
      imagePath,
      'pending',
      Date.now()
    );

    // Trigger AI background worker to process it immediately
    triggerWorker();

    return NextResponse.json({ success: true, id });

  } catch (error) {
    console.error('Single Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
  }
}
