#!/usr/bin/env node

/**
 * reset-admin-2fa.js
 * CLI script to clear 2FA credentials locally.
 * Usage: node scripts/reset-admin-2fa.js [email] [licenseKey]
 */

import { getDb } from '../lib/db.js';
import { validateLicenseKey } from '../lib/license.js';
import readline from 'readline';

const email = process.argv[2];

if (!email) {
  console.error('Error: Please specify the user email.');
  console.log('Usage: node scripts/reset-admin-2fa.js <email> [licenseKey]');
  process.exit(1);
}

const db = getDb();
const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase().trim());

if (!user) {
  console.error(`Error: User with email "${email}" not found in the database.`);
  process.exit(1);
}

// Fetch the license key stored in system_settings
let storedLicenseKey = '';
try {
  const row = db.prepare("SELECT value FROM system_settings WHERE key = 'license_key'").get();
  if (row && row.value) {
    storedLicenseKey = row.value;
  }
} catch (e) {}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askLicenseKey = () => {
  const argLicense = process.argv[3];
  if (argLicense) {
    verifyAndReset(argLicense);
    return;
  }

  rl.question('Please enter your Product License Key to verify support access: ', (inputKey) => {
    verifyAndReset(inputKey);
  });
};

const verifyAndReset = (licenseKey) => {
  rl.close();
  const cleanKey = licenseKey.trim().toUpperCase();

  // Validate the key format
  const validation = validateLicenseKey(cleanKey);
  if (!validation.isValid) {
    console.error('Error: Invalid or corrupted license key.');
    process.exit(1);
  }

  // Check if it matches the registered license key in the system
  if (storedLicenseKey && cleanKey !== storedLicenseKey.toUpperCase().trim()) {
    console.error('Error: The provided license key does not match this server\'s registered key.');
    process.exit(1);
  }

  // Disable 2FA for this user
  db.prepare('UPDATE users SET twoFactorEnabled = 0, twoFactorSecret = NULL, recoveryCodes = NULL WHERE id = ?').run(
    user.id
  );

  console.log('==================================================');
  console.log(`SUCCESS: Two-Factor Authentication (2FA) has been`);
  console.log(`disabled for user: ${user.email}`);
  console.log('==================================================');
  process.exit(0);
};

askLicenseKey();
