import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { getDb } from '@/lib/db';
import { triggerWorker } from '@/lib/worker';
import { getUser } from '@/lib/auth';

export const maxDuration = 300;

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const categoryId = formData.get('categoryId') || null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // DEBUG: Save the zip to inspect it
    await fs.writeFile(path.join(uploadsDir, 'debug_latest.zip'), buffer);

    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(buffer);


    let dataJson = [];
    const db = await getDb();

    if (loadedZip.file('data.json')) {
      const jsonStr = await loadedZip.file('data.json').async('string');
      dataJson = JSON.parse(jsonStr);
    } else {
      // Generic Directory-Structured ZIP Import
      // Folder structure -> Categories / Subcategories, Filenames -> Item Names
      const validImageExts = /\.(jpg|jpeg|png|webp|gif|heic|bmp)$/i;
      const categoryMap = new Map();

      const getOrCreateCategoryPath = async (folderParts) => {
        let currentParentId = (categoryId && categoryId !== 'null' && categoryId.trim() !== '') ? categoryId.trim() : null;
        
        if (!folderParts || folderParts.length === 0) return currentParentId;
        
        let currentPathKey = '';

        for (const rawFolderName of folderParts) {
          const folderName = rawFolderName.trim();
          if (!folderName) continue;

          currentPathKey += (currentPathKey ? '/' : '') + folderName;
          
          if (categoryMap.has(currentPathKey)) {
            currentParentId = categoryMap.get(currentPathKey);
            continue;
          }

          let catRow;
          if (currentParentId) {
            catRow = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND parentId = ?').get(folderName, currentParentId);
          } else {
            catRow = db.prepare("SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND (parentId IS NULL OR parentId = '')").get(folderName);
          }

          if (catRow) {
            currentParentId = catRow.id;
          } else {
            const newCatId = crypto.randomUUID();
            db.prepare('INSERT INTO categories (id, name, parentId, userId, createdAt) VALUES (?, ?, ?, ?, ?)').run(
              newCatId,
              folderName,
              currentParentId || null,
              user.id,
              Date.now()
            );
            currentParentId = newCatId;
          }

          categoryMap.set(currentPathKey, currentParentId);
        }

        return currentParentId || null;
      };

      const zipFiles = Object.keys(loadedZip.files);
      let importedCount = 0;

      const requestItemType = formData.get('itemType') || 'standard';

      const insertItem = db.prepare(`
        INSERT INTO items (id, barcode, name, imagePath, imagePathBack, itemType, categoryId, createdAt, syncStatus, lastSyncAttempt, userId)
        VALUES (@id, @barcode, @name, @imagePath, @imagePathBack, @itemType, @categoryId, @createdAt, @syncStatus, NULL, @userId)
      `);

      for (const relativePath of zipFiles) {
        const zipObj = loadedZip.files[relativePath];
        if (zipObj.dir) continue;

        if (relativePath.includes('__MACOSX') || relativePath.startsWith('.') || path.basename(relativePath).startsWith('.')) {
          continue;
        }

        if (!validImageExts.test(relativePath)) {
          continue;
        }

        const normalizedPath = relativePath.replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(Boolean);
        const filename = parts.pop();
        const folderParts = parts;

        const ext = path.extname(filename);
        const nameWithoutExt = path.basename(filename, ext);
        const itemName = nameWithoutExt.replace(/[-_]+/g, ' ').trim();

        if (!itemName) continue;

        const itemCatId = await getOrCreateCategoryPath(folderParts);

        const fileBuffer = await zipObj.async('nodebuffer');
        const id = crypto.randomUUID();
        const finalFilename = `${id}_${filename}`;
        await fs.writeFile(path.join(uploadsDir, finalFilename), fileBuffer);
        const imagePath = `/api/file/${finalFilename}`;

        insertItem.run({
          id,
          barcode: null,
          name: itemName,
          imagePath,
          imagePathBack: null,
          itemType: requestItemType,
          categoryId: itemCatId,
          createdAt: Date.now(),
          syncStatus: 'pending',
          userId: user.id
        });

        importedCount++;
      }

      if (importedCount > 0) {
        setTimeout(() => triggerWorker(user.id), 100);
      }

      return NextResponse.json({ success: true, count: importedCount });
    }

    const insertItem = db.prepare(`
      INSERT INTO items (id, barcode, name, imagePath, imagePathBack, itemType, categoryId, createdAt, syncStatus, lastSyncAttempt, userId)
      VALUES (@id, @barcode, @name, @imagePath, @imagePathBack, @itemType, @categoryId, @createdAt, @syncStatus, NULL, @userId)
    `);

    let triggerNeeded = false;

    for (const item of dataJson) {
      let barcode = null;
      let imagePath = null;
      let imagePathBack = null;
      let itemType = item.itemType || 'standard';
      let name = '';
      let syncStatus = 'completed';
      const id = crypto.randomUUID();

      // Helper to find and extract a file from the zip
      const extractZipFile = async (targetName) => {
        if (!targetName) return null;
        const cleanName = targetName.split('/').pop().split('\\').pop();
        // Find case-insensitive match for the base filename anywhere in the zip
        const files = loadedZip.file(new RegExp(cleanName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '$', 'i'));
        if (files && files.length > 0) {
          const fileBuffer = await files[0].async('nodebuffer');
          const finalFilename = `${id}_${cleanName}`;
          await fs.writeFile(path.join(uploadsDir, finalFilename), fileBuffer);
          return `/api/file/${finalFilename}`;
        }
        return null;
      };

      if (item.type === 'barcode') {
        barcode = item.data;
        syncStatus = 'pending';
        triggerNeeded = true;
        if (item.filename) {
          imagePath = await extractZipFile(item.filename);
        }
      } else {
        if (item.type === 'coin' || item.type === 'card') {
          // Front Image (fallback to filename if frontFilename is missing)
          imagePath = await extractZipFile(item.frontFilename || item.filename);
          // Back Image
          imagePathBack = await extractZipFile(item.backFilename);
        } else {
          imagePath = await extractZipFile(item.filename);
        }
        
        syncStatus = 'pending';
        triggerNeeded = true;
      }

      insertItem.run({
        id,
        barcode,
        name,
        imagePath,
        imagePathBack,
        itemType,
        categoryId,
        createdAt: item.timestamp || Date.now(),
        syncStatus,
        userId: user.id
      });
    }

    if (triggerNeeded) {
      // Run the worker asynchronously without blocking the response
      setTimeout(() => triggerWorker(user.id), 100);
    }

    return NextResponse.json({ success: true, count: dataJson.length });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to process upload: ' + error.message }, { status: 500 });
  }
}
