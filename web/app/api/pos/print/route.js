import { getGlobalDb } from '../../../../lib/db.js';
import { getUser } from '../../../../lib/auth.js';
import { compileEscposReceipt } from '../../../../lib/escposEncoder.js';
import net from 'net';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let NextResponse;
try {
  const nextServer = require('next/server');
  NextResponse = nextServer.NextResponse;
} catch (e) {
  NextResponse = {
    json: (body, init) => ({
      status: init?.status || 200,
      json: async () => body
    })
  };
}

async function checkAdmin() {
  const user = await getUser();
  return user && (user.isAdmin || user.isRoot);
}

export async function POST(request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const receiptData = await request.json();
    const db = await getGlobalDb();

    // Load printer configuration from system_settings
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'printer_config'").get();
    
    let config = {
      connectionType: 'browser',
      networkIp: '',
      networkPort: '9100',
      paperWidth: '80mm',
      cashDrawerKick: true,
      paperCut: true
    };

    if (row && row.value) {
      config = { ...config, ...JSON.parse(row.value) };
    }

    // Compile raw ESC/POS binary buffer
    const buffer = compileEscposReceipt(receiptData, config);

    if (config.connectionType === 'network') {
      if (!config.networkIp) {
        return NextResponse.json({ error: 'Network printer IP is not configured.' }, { status: 400 });
      }

      // Stream binary buffer to TCP Port (default 9100)
      try {
        await new Promise((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(3000); // 3 seconds timeout

          socket.connect(parseInt(config.networkPort) || 9100, config.networkIp, () => {
            socket.write(buffer);
            socket.end();
            resolve();
          });

          socket.on('error', (err) => {
            socket.destroy();
            reject(err);
          });

          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timed out connecting to printer.'));
          });
        });

        return NextResponse.json({
          success: true,
          mode: 'network',
          message: 'Receipt streamed to network thermal printer successfully.'
        });

      } catch (err) {
        console.error('Network socket print error:', err);
        return NextResponse.json({
          error: `Printer socket connection failed: ${err.message}`
        }, { status: 502 });
      }

    } else if (config.connectionType === 'usb') {
      // For USB, return hex-encoded buffer so client-side WebUSB can read and print
      return NextResponse.json({
        success: true,
        mode: 'usb',
        bufferHex: buffer.toString('hex'),
        message: 'Receipt binary compiled. Send to USB printer via WebUSB.'
      });
    }

    // Fallback/Default: regular browser printing
    return NextResponse.json({
      success: true,
      mode: 'browser',
      message: 'Regular document printer selected. Trigger browser HTML print.'
    });

  } catch (err) {
    console.error('POS Print Route Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
