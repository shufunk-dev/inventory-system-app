import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate a unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const finalFilename = `${id}_manual_${Date.now()}.${ext}`;
    
    await fs.writeFile(path.join(uploadsDir, finalFilename), buffer);
    const imagePath = `/api/file/${finalFilename}`;

    const db = await getDb();
    db.prepare('UPDATE items SET imagePath = ? WHERE id = ?').run(imagePath, id);

    return NextResponse.json({ success: true, imagePath });
  } catch (error) {
    console.error('Image Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload image: ' + error.message }, { status: 500 });
  }
}
