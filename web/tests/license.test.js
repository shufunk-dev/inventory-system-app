import test from 'node:test';
import assert from 'node:assert';
import { validateLicenseKey, generateLicenseKey } from '../lib/license.js';

test.describe('License Key System (Offline Cryptographic Verification)', () => {
  
  test('Generated keys are valid and match types', () => {
    const collectorKey = generateLicenseKey('collector');
    const storeKey = generateLicenseKey('store');
    const upgradeKey = generateLicenseKey('upgrade');

    assert.ok(collectorKey.startsWith('COLL-'), 'Collector key should start with COLL-');
    assert.ok(storeKey.startsWith('STOR-'), 'Store key should start with STOR-');
    assert.ok(upgradeKey.startsWith('UPGR-'), 'Upgrade key should start with UPGR-');

    const checkColl = validateLicenseKey(collectorKey);
    assert.strictEqual(checkColl.isValid, true);
    assert.strictEqual(checkColl.type, 'collector');

    const checkStore = validateLicenseKey(storeKey);
    assert.strictEqual(checkStore.isValid, true);
    assert.strictEqual(checkStore.type, 'store');

    const checkUpgrade = validateLicenseKey(upgradeKey);
    assert.strictEqual(checkUpgrade.isValid, true);
    assert.strictEqual(checkUpgrade.type, 'upgrade');
  });

  test('Tampering with a valid key results in invalid state', () => {
    const validKey = generateLicenseKey('store');
    
    // Change the last character
    const tamperedChar = validKey[validKey.length - 1] === 'A' ? 'B' : 'A';
    const invalidKey = validKey.substring(0, validKey.length - 1) + tamperedChar;

    const result = validateLicenseKey(invalidKey);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.type, null);
  });

  test('Invalid format strings fail gracefully', () => {
    assert.strictEqual(validateLicenseKey(null).isValid, false);
    assert.strictEqual(validateLicenseKey(undefined).isValid, false);
    assert.strictEqual(validateLicenseKey('').isValid, false);
    assert.strictEqual(validateLicenseKey('COLL-1234-ABCD').isValid, false); // missing segment
    assert.strictEqual(validateLicenseKey('XXXX-1234-ABCD-EFGH').isValid, false); // invalid prefix
  });

});
