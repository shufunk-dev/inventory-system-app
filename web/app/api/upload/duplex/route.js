import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { triggerWorker } from '@/lib/worker';
import { getUser } from '@/lib/auth';

export const maxDuration = 300;

const positionBackRegex = /(running|full|half|corner|line|defensive|tail|wing|quarter|safety|nickel|diamond|throw|flash|come|give|draw|set|play|back\s*to|back\s*2)\s+back$/i;

function parseDuplexFilename(filename) {
  if (!filename) return { stem: '', side: 0, raw: '' };
  const name = path.parse(filename).name;

  // Protect sports positions & card terms ending in "Back" (e.g. Running Back, Cornerback, Throwback)
  if (positionBackRegex.test(name)) {
    return { stem: name, side: 0, raw: name };
  }

  const match = name.match(/[\s\-_]+(front|back|f|b|a|side\s*1|side\s*2|1|2)$/i);
  if (match) {
    const marker = match[1].toLowerCase();
    const stem = name.substring(0, match.index).trim();
    let side = 0;
    if (['front', 'f', 'a', '1', 'side1', 'side 1'].includes(marker)) {
      side = 1; // Front side
    } else if (['back', 'b', '2', 'side2', 'side 2'].includes(marker)) {
      side = 2; // Back side
    }
    return { stem: stem || name, side, raw: name };
  }
  return { stem: name, side: 0, raw: name };
}

function duplexSort(a, b) {
  const nameA = typeof a === 'string' ? path.basename(a) : (a ? a.name || '' : '');
  const nameB = typeof b === 'string' ? path.basename(b) : (b ? b.name || '' : '');

  const parsedA = parseDuplexFilename(nameA);
  const parsedB = parseDuplexFilename(nameB);

  if (parsedA.stem && parsedB.stem && parsedA.stem.toLowerCase() === parsedB.stem.toLowerCase()) {
    if (parsedA.side !== 0 && parsedB.side !== 0 && parsedA.side !== parsedB.side) {
      return parsedA.side - parsedB.side;
    }
  }

  return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
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
        .sort(duplexSort);

      if (fileEntries.length === 0) {
        return NextResponse.json({ error: 'No valid image files found in ZIP archive' }, { status: 400 });
      }

      if (mode === 'duplex') {
        for (let i = 0; i < fileEntries.length; i += 2) {
          let frontEntry = fileEntries[i];
          let backEntry = fileEntries[i + 1] || null;

          let frontBuffer = await loadedZip.file(frontEntry).async('nodebuffer');
          let backBuffer = backEntry ? await loadedZip.file(backEntry).async('nodebuffer') : null;

          let frontName = path.basename(frontEntry);
          let backName = backEntry ? path.basename(backEntry) : null;

          // Orientation Swap Check
          const pFront = parseDuplexFilename(frontName);
          const pBack = backName ? parseDuplexFilename(backName) : null;
          if (pBack && pFront.side === 2 && pBack.side === 1) {
            [frontBuffer, backBuffer] = [backBuffer, frontBuffer];
            [frontName, backName] = [backName, frontName];
          }

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
        .sort(duplexSort);

      if (validFiles.length === 0) {
        return NextResponse.json({ error: 'No valid image files submitted' }, { status: 400 });
      }

      if (mode === 'duplex') {
        for (let i = 0; i < validFiles.length; i += 2) {
          let frontFile = validFiles[i];
          let backFile = validFiles[i + 1] || null;

          let frontBuffer = Buffer.from(await frontFile.arrayBuffer());
          let backBuffer = backFile ? Buffer.from(await backFile.arrayBuffer()) : null;
          let frontName = frontFile.name;
          let backName = backFile ? backFile.name : null;

          // Orientation Swap Check
          const pFront = parseDuplexFilename(frontName);
          const pBack = backName ? parseDuplexFilename(backName) : null;
          if (pBack && pFront.side === 2 && pBack.side === 1) {
            [frontBuffer, backBuffer] = [backBuffer, frontBuffer];
            [frontName, backName] = [backName, frontName];
          }

          imagePairs.push({
            frontBuffer,
            frontName,
            backBuffer,
            backName
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

      const rawTitle = parseDuplexFilename(pair.frontName).stem;
      const cleanTitle = rawTitle.replace(/[-_]/g, ' ').trim();
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
