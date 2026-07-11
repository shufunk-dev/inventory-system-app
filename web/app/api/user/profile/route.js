import { NextResponse } from 'next/server';
import { getGlobalDb } from '@/lib/db';
import { getUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const displayName = formData.get('displayName')?.toString().trim();
    const file = formData.get('profilePicture');

    const db = await getGlobalDb();
    let profilePictureFilename = user.profilePicture;

    if (file && typeof file === 'object' && file.size > 0) {
      const uploadDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || '.jpg';
      profilePictureFilename = `${user.id}_avatar_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, profilePictureFilename);

      // Clean up old avatar
      if (user.profilePicture) {
        try {
          const oldPath = path.join(uploadDir, user.profilePicture);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        } catch (e) {
          console.error('Failed to delete old avatar:', e);
        }
      }

      fs.writeFileSync(filePath, buffer);
    }

    const finalDisplayName = displayName || user.displayName || user.email.split('@')[0];

    db.prepare('UPDATE users SET displayName = ?, profilePicture = ? WHERE id = ?').run(
      finalDisplayName,
      profilePictureFilename,
      user.id
    );

    return NextResponse.json({ 
      success: true, 
      displayName: finalDisplayName, 
      profilePicture: profilePictureFilename 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
