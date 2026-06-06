import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { getDb, closeDb } from '../lib/db.js';
import { 
  getTenantDbPath, 
  getRegistryDbPath, 
  registerTenantUser, 
  resolveTenantIdByEmail,
  tenantStorage,
  closeAllConnections
} from '../lib/dbManager.js';

// Setup isolated testing environment directory
process.env.USER_DATA_PATH = path.resolve(process.cwd(), 'test_data');

function cleanupTestData() {
  closeDb();
  closeAllConnections();
  const testDir = path.resolve(process.cwd(), 'test_data');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

test.describe('Database Multi-Tenancy Architecture (Option 3)', () => {
  
  test.beforeEach(() => {
    cleanupTestData();
  });

  test.after(() => {
    cleanupTestData();
  });

  test('Local-First Mode: Default fallback to inventory.db', async () => {
    process.env.SAAS_MODE = 'false';
    const db = await getDb();
    
    // Ensure standard queries execute successfully
    db.prepare('CREATE TABLE IF NOT EXISTS test_local (val TEXT)').run();
    db.prepare('INSERT INTO test_local (val) VALUES (?)').run('local_value');
    
    const row = db.prepare('SELECT val FROM test_local').get();
    assert.strictEqual(row.val, 'local_value');
    
    // Verify file exists at the local path
    const localDbFile = path.resolve(process.env.USER_DATA_PATH, 'inventory.db');
    assert.ok(fs.existsSync(localDbFile), 'Local inventory.db file should exist');
  });

  test('SaaS Mode: Resolving database from AsyncLocalStorage', async () => {
    process.env.SAAS_MODE = 'true';
    
    // Invoking getDb() outside a valid tenant scope must throw an error
    await assert.rejects(async () => {
      await getDb();
    }, /outside of an active tenant context/);

    // Run queries within Tenant A context
    await new Promise((resolve, reject) => {
      tenantStorage.run({ tenantId: 'tenant_a' }, async () => {
        try {
          const dbA = await getDb();
          dbA.prepare('CREATE TABLE IF NOT EXISTS test_tenant (val TEXT)').run();
          dbA.prepare('INSERT INTO test_tenant (val) VALUES (?)').run('data_for_a');
          
          const row = dbA.prepare('SELECT val FROM test_tenant').get();
          assert.strictEqual(row.val, 'data_for_a');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // Run queries within Tenant B context
    await new Promise((resolve, reject) => {
      tenantStorage.run({ tenantId: 'tenant_b' }, async () => {
        try {
          const dbB = await getDb();
          dbB.prepare('CREATE TABLE IF NOT EXISTS test_tenant (val TEXT)').run();
          dbB.prepare('INSERT INTO test_tenant (val) VALUES (?)').run('data_for_b');
          
          const row = dbB.prepare('SELECT val FROM test_tenant').get();
          assert.strictEqual(row.val, 'data_for_b');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // Proving Isolation: Querying Tenant A's database should NOT retrieve Tenant B's data
    await new Promise((resolve, reject) => {
      tenantStorage.run({ tenantId: 'tenant_a' }, async () => {
        try {
          const dbA = await getDb();
          const rows = dbA.prepare('SELECT val FROM test_tenant').all();
          assert.strictEqual(rows.length, 1);
          assert.strictEqual(rows[0].val, 'data_for_a');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // Ensure physical files exist at the resolved location
    assert.ok(fs.existsSync(getTenantDbPath('tenant_a')), 'Database file for Tenant A should exist');
    assert.ok(fs.existsSync(getTenantDbPath('tenant_b')), 'Database file for Tenant B should exist');
  });

  test('SaaS Mode: Email-based tenant registry resolving', () => {
    process.env.SAAS_MODE = 'true';
    
    registerTenantUser('clientA@bar.com', 'tenant_abc');
    registerTenantUser('clientB@cafe.com', 'tenant_xyz');

    const resolvedA = resolveTenantIdByEmail('clientA@bar.com');
    const resolvedB = resolveTenantIdByEmail('clientB@cafe.com');

    assert.strictEqual(resolvedA, 'tenant_abc');
    assert.strictEqual(resolvedB, 'tenant_xyz');

    // Case-insensitivity and trim checks
    assert.strictEqual(resolveTenantIdByEmail(' CLIENTA@bar.com '), 'tenant_abc');

    // Registry file must physically exist on disk
    assert.ok(fs.existsSync(getRegistryDbPath()), 'Registry database should exist');
  });

  test('SaaS Mode: Concurrent transactions isolation check', async () => {
    process.env.SAAS_MODE = 'true';

    // Seed structural tables for both tenants
    await new Promise((resolve, reject) => {
      tenantStorage.run({ tenantId: 'tenant_x' }, async () => {
        try {
          const db = await getDb();
          db.prepare('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, msg TEXT)').run();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
    await new Promise((resolve, reject) => {
      tenantStorage.run({ tenantId: 'tenant_y' }, async () => {
        try {
          const db = await getDb();
          db.prepare('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, msg TEXT)').run();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // Concurrent execution helper
    const insertOp = (tenantId, id, message) => {
      return new Promise((resolve, reject) => {
        tenantStorage.run({ tenantId }, async () => {
          try {
            const db = await getDb();
            db.prepare('INSERT INTO test_table (id, msg) VALUES (?, ?)').run(id, message);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    };

    // Run parallel inserts on identical primary keys across separate DB files
    await Promise.all([
      insertOp('tenant_x', 1, 'hello from x'),
      insertOp('tenant_y', 1, 'hello from y')
    ]);

    // Verify each database retrieved its respective unique record
    await new Promise((resolve, reject) => {
      tenantStorage.run({ tenantId: 'tenant_x' }, async () => {
        try {
          const db = await getDb();
          const row = db.prepare('SELECT msg FROM test_table WHERE id = 1').get();
          assert.strictEqual(row.msg, 'hello from x');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    await new Promise((resolve, reject) => {
      tenantStorage.run({ tenantId: 'tenant_y' }, async () => {
        try {
          const db = await getDb();
          const row = db.prepare('SELECT msg FROM test_table WHERE id = 1').get();
          assert.strictEqual(row.msg, 'hello from y');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  });

});
