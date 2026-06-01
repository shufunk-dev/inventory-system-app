const { app, BrowserWindow, Tray, Menu, shell, clipboard } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const os = require('os');
const net = require('net');

let tray = null;
let mainWindow = null;
let serverProcess = null;

const PORT = 3000;

// Helper to get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function checkServerReady(port, callback) {
  const socket = new net.Socket();
  socket.setTimeout(2000);
  socket.on('connect', () => {
    socket.destroy();
    callback(true);
  });
  socket.on('timeout', () => {
    socket.destroy();
    callback(false);
  });
  socket.on('error', () => {
    socket.destroy();
    callback(false);
  });
  socket.connect(port, '127.0.0.1');
}

function waitForServer(port, callback) {
  const interval = setInterval(() => {
    checkServerReady(port, (isReady) => {
      if (isReady) {
        clearInterval(interval);
        callback();
      }
    });
  }, 1000);
}

function createWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Inventory System",
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Use a default electron icon if custom icon is not present yet
  // electron-builder will provide an icon, but we use a blank native image as fallback during dev
  const { nativeImage } = require('electron');
  
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
  tray = new Tray(icon);
  
  const localIP = getLocalIP();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open App (Desktop Window)',
      click: () => {
        createWindow();
      }
    },
    {
      label: 'Open App (Default Browser)',
      click: () => {
        shell.openExternal(`http://localhost:${PORT}`);
      }
    },
    { type: 'separator' },
    {
      label: `Mobile Access IP: ${localIP}`,
      sublabel: '(Click to copy to clipboard)',
      click: () => {
        clipboard.writeText(localIP);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Server',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Inventory System Server');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    createWindow();
  });
}

function startNextJsServer() {
  const serverPath = path.join(__dirname, 'next-server', 'server.js');
  
  // Load environment variables from .env.local if present
  let customEnv = {};
  try {
    const fs = require('fs');
    const envPath = path.join(__dirname, 'next-server', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let key = match[1];
          let value = match[2] || '';
          value = value.trim().replace(/^['"](.*)['"]$/, '$1');
          customEnv[key] = value;
        }
      });
    }
  } catch (e) {
    console.error('Failed to load .env.local:', e);
  }
  
  // Spawn the Next.js standalone server as a child process using Electron's Node runtime
  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      ...customEnv,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: PORT.toString(),
      NODE_ENV: 'production',
      USER_DATA_PATH: app.getPath('userData')
    },
    stdio: 'pipe'
  });

  const logPath = path.join(app.getPath('userData'), 'nextjs-error.log');
  const fs = require('fs');
  fs.writeFileSync(logPath, 'Starting Next.js\\n', { flag: 'a' });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data.toString()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Next.js ERROR] ${data.toString()}`);
    fs.writeFileSync(logPath, `[Next.js ERROR] ${data.toString()}\\n`, { flag: 'a' });
  });
}

const IPC_PORT = 3001;
let updateStatus = { status: 'idle', message: '', version: '' };

function startIPCServer() {
  const http = require('http');
  const server = http.createServer((req, res) => {
    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    
    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updateStatus));
    } else if (req.method === 'POST' && req.url === '/check') {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.checkForUpdates().catch(e => {
        updateStatus = { status: 'error', message: e.message, version: '' };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } else if (req.method === 'POST' && req.url === '/install') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      
      const { autoUpdater } = require('electron-updater');
      
      // Delay to allow Next.js to finish current requests
      setTimeout(() => {
        if (serverProcess) {
          serverProcess.kill();
        }
        setTimeout(() => {
          autoUpdater.quitAndInstall();
        }, 1000);
      }, 2000);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(IPC_PORT, '127.0.0.1');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

  app.whenReady().then(() => {
    const { autoUpdater } = require("electron-updater");
    
    autoUpdater.on('checking-for-update', () => {
      updateStatus = { status: 'checking', message: 'Checking for updates...', version: '' };
    });
    
    autoUpdater.on('update-available', (info) => {
      updateStatus = { status: 'available', message: 'Update available. Downloading...', version: info.version };
    });
    
    autoUpdater.on('update-not-available', () => {
      updateStatus = { status: 'up-to-date', message: 'System is up to date.', version: '' };
    });
    
    autoUpdater.on('error', (err) => {
      updateStatus = { status: 'error', message: err.message, version: '' };
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      updateStatus = { status: 'downloaded', message: 'Update ready to install.', version: info.version };
    });

    // Start the internal IPC server
    startIPCServer();

    // Run the initial check
    autoUpdater.checkForUpdates().catch(e => {
      updateStatus = { status: 'error', message: e.message, version: '' };
    });

    startNextJsServer();
    createTray();
    
    waitForServer(PORT, () => {
      createWindow();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    // Prevent the app from quitting when all windows are closed
    // It should keep running in the system tray until the user explicitly quits
  });

  app.on('before-quit', () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}
