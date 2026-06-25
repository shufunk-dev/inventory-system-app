import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { SignJWT, importPKCS8, generateKeyPair, importSPKI, jwtVerify } from 'jose';
import { verifySupportToken } from '../lib/supportToken.js';
import { getMachineId } from '../lib/machine.js';

test.describe('Remote Support Cryptographic Token System', () => {

  // Test 1: Machine ID can be calculated and is a stable string
  test('Machine ID is resolved as a valid SHA-256 hex string', () => {
    const machineId = getMachineId();
    assert.strictEqual(typeof machineId, 'string');
    assert.strictEqual(machineId.length, 64); // SHA-256 hex is 64 chars
  });

  // Test 2: Invalid support token formats fail gracefully
  test('Invalid support token formats fail with appropriate error messages', async () => {
    await assert.rejects(
      async () => await verifySupportToken(null),
      /Support token must be a non-empty string/
    );

    await assert.rejects(
      async () => await verifySupportToken(''),
      /Support token must be a non-empty string/
    );

    await assert.rejects(
      async () => await verifySupportToken('not.a.validjwt'),
      /Invalid support token signature|Invalid JWS|JWS Protected Header is invalid/
    );
  });

  // Test 3: Token with signature signed by an arbitrary key pair fails signature verification
  test('Tokens signed by foreign/invalid keys fail signature verification', async () => {
    // Generate an arbitrary foreign EC keypair
    const { publicKey, privateKey } = await generateKeyPair('ES256', {
      modulusLength: 2048
    });

    const foreignToken = await new SignJWT({
      machineId: getMachineId(),
      supportEmail: 'attacker@badsite.com',
      supportName: 'Fake Support'
    })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    await assert.rejects(
      async () => await verifySupportToken(foreignToken),
      /signature verification failed/i
    );
  });

  // Test 4: Token with different Machine ID fails machine validation
  test('Tokens signed by the true key but bound to a different Machine ID fail validation', async () => {
    const privKeyPath = path.join(process.cwd(), 'support_private.pem');
    if (!fs.existsSync(privKeyPath)) {
      console.log('Skipping true-key mismatch test (no local support_private.pem).');
      return;
    }

    const privateKeyPem = fs.readFileSync(privKeyPath, 'utf8');
    const privateKey = await importPKCS8(privateKeyPem, 'ES256');

    // Token for a different machine
    const mismatchedToken = await new SignJWT({
      machineId: '0000000000000000000000000000000000000000000000000000000000000000',
      supportEmail: 'support@shufeltdesigns.com',
      supportName: 'Remote Support Admin'
    })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    await assert.rejects(
      async () => await verifySupportToken(mismatchedToken),
      /Machine ID mismatch/
    );
  });

  // Test 5: Expired token fails validation
  test('Expired tokens signed by the true key fail validation', async () => {
    const privKeyPath = path.join(process.cwd(), 'support_private.pem');
    if (!fs.existsSync(privKeyPath)) {
      console.log('Skipping true-key expiry test (no local support_private.pem).');
      return;
    }

    const privateKeyPem = fs.readFileSync(privKeyPath, 'utf8');
    const privateKey = await importPKCS8(privateKeyPem, 'ES256');

    // Expired token (expires 1 hour ago)
    const expiredToken = await new SignJWT({
      machineId: getMachineId(),
      supportEmail: 'support@shufeltdesigns.com',
      supportName: 'Remote Support Admin'
    })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .setExpirationTime('-1h')
      .sign(privateKey);

    await assert.rejects(
      async () => await verifySupportToken(expiredToken),
      /Support token has expired/
    );
  });

  // Test 6: Valid token succeeds
  test('Valid tokens signed by the true key and matching Machine ID succeed', async () => {
    const privKeyPath = path.join(process.cwd(), 'support_private.pem');
    if (!fs.existsSync(privKeyPath)) {
      console.log('Skipping valid-token test (no local support_private.pem).');
      return;
    }

    const privateKeyPem = fs.readFileSync(privKeyPath, 'utf8');
    const privateKey = await importPKCS8(privateKeyPem, 'ES256');

    const validToken = await new SignJWT({
      machineId: getMachineId(),
      supportEmail: 'support@shufeltdesigns.com',
      supportName: 'Remote Support Admin'
    })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(privateKey);

    const payload = await verifySupportToken(validToken);
    assert.strictEqual(payload.machineId, getMachineId());
    assert.strictEqual(payload.supportEmail, 'support@shufeltdesigns.com');
    assert.strictEqual(payload.supportName, 'Remote Support Admin');
  });

});
