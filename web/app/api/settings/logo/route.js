import { NextResponse } from 'next/server';
import { getGlobalDb } from '@/lib/db';
import { getUser } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

async function checkAdmin() {
  const user = await getUser();
  return user && (user.isAdmin || user.isRoot);
}

export async function POST(request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('logo');

    if (!file || typeof file !== 'object' || file.size === 0) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || '.png';
    const filename = `store_logo_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    const imagePath = `/api/file/${filename}`;

    return NextResponse.json({ success: true, imagePath });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Failed to process logo upload: ' + error.message }, { status: 500 });
  }
}
