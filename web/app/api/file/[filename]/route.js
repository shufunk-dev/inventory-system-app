import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
  const { filename } = await params;
  if (!filename) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const uploadsDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, filename);
    const buffer = await fs.readFile(filePath);

    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';

    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
