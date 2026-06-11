import os from 'os';
import crypto from 'crypto';

/**
 * Generates a unique, stable Machine ID for hardware-locking license keys.
 * Uses network interface MAC addresses (excluding loopbacks) and hashes them.
 * Falls back to username + hostname if no network interface is active.
 */
export function getMachineId() {
  try {
    const interfaces = os.networkInterfaces();
    const macs = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Exclude internal/loopback and blank MAC addresses
        if (iface.mac && iface.mac !== '00:00:00:00:00:00' && !iface.internal) {
          macs.push(iface.mac);
        }
      }
    }

    if (macs.length > 0) {
      // Sort to guarantee order stability across interface list changes
      macs.sort();
      return crypto
        .createHash('sha256')
        .update(macs.join(','))
        .digest('hex');
    }
  } catch (err) {
    console.error('[machine_id] Failed to resolve MAC addresses:', err);
  }

  // Fallback signature
  const fallbackString = `${os.hostname()}-${os.userInfo().username}`;
  return crypto
    .createHash('sha256')
    .update(fallbackString)
    .digest('hex');
}
