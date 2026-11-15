#!/usr/bin/env node
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const dataPath = process.env.USER_DATA_PATH || process.cwd();
const dbPath = path.resolve(dataPath, 'inventory.db');
const db = new Database(dbPath);

const email = process.argv[2] || 'admin@local';
const password = process.argv[3] || 'admin123';

const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync(password, salt);
const now = Date.now();

// 1. Ensure system_settings has store mode active
db.exec(`
  CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT);
  INSERT OR REPLACE INTO system_settings (key, value) VALUES ('system_mode', 'store');
  INSERT OR REPLACE INTO system_settings (key, value) VALUES ('license_type', 'store');
  INSERT OR REPLACE INTO system_settings (key, value) VALUES ('license_status', 'active');
`);

// 2. Ensure users table exists and insert root admin
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    passwordHash TEXT,
    tier TEXT DEFAULT 'basic',
    activeTier TEXT DEFAULT 'basic',
    isAdmin INTEGER DEFAULT 0,
    isRoot INTEGER DEFAULT 0,
    displayName TEXT,
    role TEXT DEFAULT 'admin',
    status TEXT DEFAULT 'active',
    createdAt INTEGER
  );
`);

db.prepare(`
  INSERT OR REPLACE INTO users (
    id, email, passwordHash, tier, activeTier, isAdmin, isRoot, displayName, role, status, createdAt
  ) VALUES (
    'root-admin', ?, ?, 'premium', 'premium', 1, 1, 'Administrator', 'admin', 'active', ?
  )
`).run(email.toLowerCase().trim(), passwordHash, now);

// 3. Auto-link any custom store databases (including store_9f7a88f1-45c2-4197-9428-f6d617297bdb.sqlite)
db.exec(`
  CREATE TABLE IF NOT EXISTS store_profiles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    boothNumber TEXT,
    createdAt INTEGER
  );
`);

try {
  const files = fs.readdirSync(dataPath);
  for (const file of files) {
    if (file.startsWith('store_') && file.endsWith('.sqlite')) {
      const storeId = file.slice('store_'.length, -'.sqlite'.length);
      const existing = db.prepare("SELECT id FROM store_profiles WHERE id = ?").get(storeId);
      if (!existing) {
        const storeName = storeId.startsWith('booth-') ? storeId : 'My Bookstore';
        const boothNum = storeId.startsWith('booth-') ? storeId.split('-')[1] : '001';
        try {
          db.prepare("INSERT OR REPLACE INTO store_profiles (id, name, boothNumber, createdAt) VALUES (?, ?, ?, ?)")
            .run(storeId, storeName, boothNum, now);
          console.log(`Linked store database: ${file} as "${storeName}"`);
        } catch (e) {}
      }
    }
  }
} catch (e) {}

console.log('==================================================');
console.log(' Admin Account Configured & Ready!');
console.log(` Email:    ${email.toLowerCase().trim()}`);
console.log(` Password: ${password}`);
console.log(' Setup lock removed! You can now sign in at /login');
console.log('==================================================');
db.close();
