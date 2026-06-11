import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import axios from 'axios';
import { getMachineId } from '../lib/machine.js';
import { generateLicenseKey, activateLicenseOnServer, deactivateDeviceOnServer } from '../lib/license.js';
import mockServer from '../scripts/mock-licensing-server.js';

const PORT = 3005;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

test.describe('License Multi-Seat & Single-Device Deactivation Cooldown', () => {

  test.before(async () => {
    return new Promise((resolve) => {
      mockServer.listen(PORT, '127.0.0.1', () => {
        console.log(`[Test Server] Mock Licensing Server active on port ${PORT}`);
        resolve();
      });
    });
  });

  test.after(async () => {
    return new Promise((resolve) => {
      mockServer.close(() => {
        console.log('[Test Server] Mock Licensing Server stopped.');
        resolve();
      });
    });
  });

  test('Machine ID is unique, stable, and non-empty', () => {
    const id1 = getMachineId();
    const id2 = getMachineId();
    
    assert.ok(id1, 'Machine ID should be populated');
    assert.strictEqual(id1.length, 64, 'Machine ID should be a SHA-256 hash (64 chars)');
    assert.strictEqual(id1, id2, 'Machine ID should be stable across multiple calls on the same device');
  });

  test('Multi-Seat Activation & Single-Device Deactivation with 7-Day Cooldown', async () => {
    const licenseKey = generateLicenseKey('store', 'INV-99999');
    
    // 1. Configure this key to have exactly 3 device seats on the server
    const configureRes = await axios.post(`${SERVER_URL}/api/test/set-seat-limit`, {
      licenseKey,
      maxDevices: 3
    });
    assert.strictEqual(configureRes.status, 200);
    assert.strictEqual(configureRes.data.maxDevices, 3);

    // 2. Activate Device 1 (Local PC): should succeed
    const actLocal = await activateLicenseOnServer(licenseKey, SERVER_URL);
    assert.strictEqual(actLocal.success, true);
    assert.match(actLocal.message, /activated/);

    // 3. Activate Device 2 (Simulated): should succeed
    const act2Res = await axios.post(`${SERVER_URL}/api/license/activate`, {
      licenseKey,
      machineId: 'remote-hash-device-2',
      hostname: 'REMOTE-PC-2',
      username: 'clerk_bob'
    });
    assert.strictEqual(act2Res.status, 200);
    assert.strictEqual(act2Res.data.success, true);

    // 4. Activate Device 3 (Simulated): should succeed
    const act3Res = await axios.post(`${SERVER_URL}/api/license/activate`, {
      licenseKey,
      machineId: 'remote-hash-device-3',
      hostname: 'REMOTE-PC-3',
      username: 'clerk_charlie'
    });
    assert.strictEqual(act3Res.status, 200);
    assert.strictEqual(act3Res.data.success, true);

    // 5. Try to activate Device 4 (Simulated): should FAIL because limit is 3
    try {
      await axios.post(`${SERVER_URL}/api/license/activate`, {
        licenseKey,
        machineId: 'remote-hash-device-4',
        hostname: 'REMOTE-PC-4',
        username: 'attacker_dan'
      });
      assert.fail('Should have failed to exceed the 3-device seat limit');
    } catch (err) {
      assert.strictEqual(err.response.status, 403);
      assert.strictEqual(err.response.data.success, false);
      assert.match(err.response.data.error, /device limit reached/i);
    }

    // 6. Deactivate Device 2 (representing a broken machine): should succeed
    const deactRes1 = await deactivateDeviceOnServer(licenseKey, 'remote-hash-device-2', SERVER_URL);
    assert.strictEqual(deactRes1.success, true);
    assert.match(deactRes1.message, /deactivated/);

    // 7. Try to deactivate Device 3 immediately: should FAIL due to 7-day deactivation cooldown
    const deactRes2 = await deactivateDeviceOnServer(licenseKey, 'remote-hash-device-3', SERVER_URL);
    assert.strictEqual(deactRes2.success, false);
    assert.match(deactRes2.error, /once every 7 days/);

    // 8. Bypass deactivation cooldown (simulate 8 days passing)
    const bypassRes = await axios.post(`${SERVER_URL}/api/test/bypass-cooldown`, { licenseKey });
    assert.strictEqual(bypassRes.status, 200);

    // 9. Deactivate Device 3 now: should succeed
    const deactRes3 = await deactivateDeviceOnServer(licenseKey, 'remote-hash-device-3', SERVER_URL);
    assert.strictEqual(deactRes3.success, true);

    // 10. We now have 2 free seats! Activate Device 4 (the replacement PC): should succeed
    const act4Res = await axios.post(`${SERVER_URL}/api/license/activate`, {
      licenseKey,
      machineId: 'remote-hash-device-4',
      hostname: 'REPLACEMENT-PC-4',
      username: 'clerk_dan'
    });
    assert.strictEqual(act4Res.status, 200);
    assert.strictEqual(act4Res.data.success, true);
  });

});
