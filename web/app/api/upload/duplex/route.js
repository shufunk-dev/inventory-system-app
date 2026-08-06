import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { triggerWorker } from '@/lib/worker';
import { getUser } from '@/lib/auth';

export const maxDuration = 300;

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const mode = formData.get('mode') || 'duplex'; // 'duplex' or 'single'
    const categoryId = formData.get('categoryId') || null;
    const zipFile = formData.get('zipFile');
    const uploadedFiles = formData.getAll('files');

    const uploadsDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const validImageExts = /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i;
    const db = await getDb();

    const insertItem = db.prepare(`
      INSERT INTO items (
        id, userId, categoryId, name, itemType, imagePath, imagePathBack, syncStatus, createdAt
      ) VALUES (
        @id, @userId, @categoryId, @name, @itemType, @imagePath, @imagePathBack, @syncStatus, @createdAt
      )
    `);

    let imagePairs = []; // Array of { frontBuffer, frontName, backBuffer, backName }

    if (zipFile && zipFile.size > 0) {
      // Branch A: Process ZIP Archive
      const arrayBuffer = await zipFile.arrayBuffer();
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(Buffer.from(arrayBuffer));

      const fileEntries = Object.keys(loadedZip.files)
        .filter(filename => !loadedZip.files[filename].dir && validImageExts.test(filename))
        .sort(naturalSort);

      if (fileEntries.length === 0) {
        return NextResponse.json({ error: 'No valid image files found in ZIP archive' }, { status: 400 });
      }

      if (mode === 'duplex') {
        for (let i = 0; i < fileEntries.length; i += 2) {
          const frontEntry = fileEntries[i];
          const backEntry = fileEntries[i + 1] || null;

          const frontBuffer = await loadedZip.file(frontEntry).async('nodebuffer');
          const backBuffer = backEntry ? await loadedZip.file(backEntry).async('nodebuffer') : null;

          const frontName = path.basename(frontEntry);
          const backName = backEntry ? path.basename(backEntry) : null;

          imagePairs.push({ frontBuffer, frontName, backBuffer, backName });
        }
      } else {
        // Single-sided mode
        for (const entry of fileEntries) {
          const frontBuffer = await loadedZip.file(entry).async('nodebuffer');
          const frontName = path.basename(entry);
          imagePairs.push({ frontBuffer, frontName, backBuffer: null, backName: null });
        }
      }
    } else if (uploadedFiles && uploadedFiles.length > 0) {
      // Branch B: Multi-File / Folder Drag & Drop
      const validFiles = uploadedFiles
        .filter(f => f && f.name && validImageExts.test(f.name))
        .sort((a, b) => naturalSort(a.name, b.name));

      if (validFiles.length === 0) {
        return NextResponse.json({ error: 'No valid image files submitted' }, { status: 400 });
      }

      if (mode === 'duplex') {
        for (let i = 0; i < validFiles.length; i += 2) {
          const frontFile = validFiles[i];
          const backFile = validFiles[i + 1] || null;

          const frontBuffer = Buffer.from(await frontFile.arrayBuffer());
          const backBuffer = backFile ? Buffer.from(await backFile.arrayBuffer()) : null;

          imagePairs.push({
            frontBuffer,
            frontName: frontFile.name,
            backBuffer,
            backName: backFile ? backFile.name : null
          });
        }
      } else {
        // Single-sided mode
        for (const file of validFiles) {
          const frontBuffer = Buffer.from(await file.arrayBuffer());
          imagePairs.push({
            frontBuffer,
            frontName: file.name,
            backBuffer: null,
            backName: null
          });
        }
      }
    } else {
      return NextResponse.json({ error: 'Please upload either a ZIP archive or image files.' }, { status: 400 });
    }

    const createdItems = [];

    // Save image pairs & create DB records
    for (const pair of imagePairs) {
      const id = crypto.randomUUID();
      const extFront = path.extname(pair.frontName) || '.jpg';
      const frontFilename = `duplex_${id}_front${extFront}`;
      await fs.writeFile(path.join(uploadsDir, frontFilename), pair.frontBuffer);
      const imagePath = `/api/file/${frontFilename}`;

      let imagePathBack = null;
      if (pair.backBuffer && pair.backName) {
        const extBack = path.extname(pair.backName) || '.jpg';
        const backFilename = `duplex_${id}_back${extBack}`;
        await fs.writeFile(path.join(uploadsDir, backFilename), pair.backBuffer);
        imagePathBack = `/api/file/${backFilename}`;
      }

      const cleanTitle = path.parse(pair.frontName).name.replace(/[-_]/g, ' ');
      const name = `Card (${cleanTitle})`;

      insertItem.run({
        id,
        userId: user.id,
        categoryId: categoryId || null,
        name,
        itemType: 'card',
        imagePath,
        imagePathBack,
        syncStatus: 'pending',
        createdAt: Date.now()
      });

      createdItems.push({
        id,
        name,
        imagePath,
        imagePathBack
      });
    }

    // Trigger AI identification worker asynchronously
    setTimeout(() => {
      try {
        triggerWorker(user.id);
      } catch (err) {
        console.error('Failed to trigger worker after duplex upload:', err);
      }
    }, 100);

    return NextResponse.json({
      success: true,
      count: createdItems.length,
      mode,
      items: createdItems
    });
  } catch (error) {
    console.error('Duplex Ingestion Error:', error);
    return NextResponse.json({ error: 'Failed to process duplex scan upload: ' + error.message }, { status: 500 });
  }
}
