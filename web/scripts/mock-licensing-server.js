const http = require('http');
const url = require('url');

const PORT = 3005;

// In-memory database of registered keys
// Format: { licenseKey: { devices: [{ machineId, hostname, username, activatedAt }], maxDevices: 1, lastDeactivatedAt: 0 } }
const licenseDb = {};

// Cooldown definition: 7 days in milliseconds
const DEACTIVATION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const server = http.createServer((req, res) => {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  if (req.method === 'POST' && parsedUrl.pathname === '/api/license/activate') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { licenseKey, machineId, hostname, username } = JSON.parse(body);
        if (!licenseKey || !machineId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing licenseKey or machineId.' }));
          return;
        }

        const cleanKey = licenseKey.toUpperCase().trim();
        let record = licenseDb[cleanKey];

        if (!record) {
          // Initialize a standard single-device record if it doesn't exist
          record = {
            devices: [],
            maxDevices: 1,
            lastDeactivatedAt: 0
          };
          licenseDb[cleanKey] = record;
        }

        // Check if this machine is already activated on this key
        const existingDeviceIndex = record.devices.findIndex(d => d.machineId === machineId);

        if (existingDeviceIndex !== -1) {
          // Already registered, update check-in info
          record.devices[existingDeviceIndex].hostname = hostname || 'Unknown Host';
          record.devices[existingDeviceIndex].username = username || 'Unknown User';
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'License verified for this device.' }));
          return;
        }

        // New device activation check: are there available seats?
        if (record.devices.length >= record.maxDevices) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `License device limit reached (${record.maxDevices} device seats). Please deactivate a device first.`
          }));
          return;
        }

        // Register the new device seat
        record.devices.push({
          machineId: machineId,
          hostname: hostname || 'Unknown Host',
          username: username || 'Unknown User',
          activatedAt: Date.now()
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'License key successfully activated on this device.' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } 
  
  else if (req.method === 'POST' && parsedUrl.pathname === '/api/license/deactivate-device') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { licenseKey, machineIdToRemove } = JSON.parse(body);
        if (!licenseKey || !machineIdToRemove) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing licenseKey or machineIdToRemove.' }));
          return;
        }

        const cleanKey = licenseKey.toUpperCase().trim();
        const record = licenseDb[cleanKey];

        if (!record) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'License key not found.' }));
          return;
        }

        // Verify device is registered
        const deviceIndex = record.devices.findIndex(d => d.machineId === machineIdToRemove);
        if (deviceIndex === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Device is not registered with this license key.' }));
          return;
        }

        // Enforce 7-day deactivation cooldown
        const now = Date.now();
        const elapsed = now - record.lastDeactivatedAt;

        if (elapsed < DEACTIVATION_COOLDOWN_MS) {
          const remainingDays = Math.ceil((DEACTIVATION_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Device deactivations can only be performed once every 7 days. Cooldown active for ${remainingDays} more days.`
          }));
          return;
        }

        // Cooldown has elapsed: remove this specific device seat
        record.devices.splice(deviceIndex, 1);
        record.lastDeactivatedAt = now;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Device successfully deactivated from this license.' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } 

  // Custom API endpoint to configure multi-seat keys for testing
  else if (req.method === 'POST' && parsedUrl.pathname === '/api/test/set-seat-limit') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { licenseKey, maxDevices } = JSON.parse(body);
        const cleanKey = licenseKey.toUpperCase().trim();
        
        if (!licenseDb[cleanKey]) {
          licenseDb[cleanKey] = {
            devices: [],
            maxDevices: maxDevices || 1,
            lastDeactivatedAt: 0
          };
        } else {
          licenseDb[cleanKey].maxDevices = maxDevices || 1;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, maxDevices: licenseDb[cleanKey].maxDevices }));
      } catch (e) {
        res.writeHead(500);
        res.end();
      }
    });
  }
  
  // Custom API endpoint for test suites to bypass 7-day cooldown
  else if (req.method === 'POST' && parsedUrl.pathname === '/api/test/bypass-cooldown') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { licenseKey } = JSON.parse(body);
        const cleanKey = licenseKey.toUpperCase().trim();
        if (licenseDb[cleanKey]) {
          // Shift the timestamp back 8 days
          licenseDb[cleanKey].lastDeactivatedAt = Date.now() - (8 * 24 * 60 * 60 * 1000);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404);
          res.end();
        }
      } catch (e) {
        res.writeHead(500);
        res.end();
      }
    });
  }

  else {
    res.writeHead(404);
    res.end();
  }
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Mock Licensing Server running at http://127.0.0.1:${PORT}`);
  });
}

module.exports = server;
