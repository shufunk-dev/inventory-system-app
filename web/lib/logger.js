import fs from 'fs';
import path from 'path';

const logFile = path.join(process.env.USER_DATA_PATH || process.cwd(), 'app.log');

const maxLines = 500;
export const logBuffer = [];

function appendLog(type, args) {
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg); } catch (e) { return String(arg); }
    }
    return String(arg);
  }).join(' ');

  const timestamp = new Date().toISOString();
  const formattedLine = `[${timestamp}] [${type}] ${message}`;

  // Add to in-memory buffer
  logBuffer.push(formattedLine);
  if (logBuffer.length > maxLines) {
    logBuffer.shift();
  }

  // Append to app.log file safely
  try {
    fs.appendFileSync(logFile, formattedLine + '\n', 'utf8');
    
    // Periodically prune file if it grows too large (e.g. > 2MB)
    const stats = fs.statSync(logFile);
    if (stats.size > 2 * 1024 * 1024) {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      if (lines.length > 1000) {
        fs.writeFileSync(logFile, lines.slice(-1000).join('\n') + '\n', 'utf8');
      }
    }
  } catch (err) {
    // Avoid recursion or crashing if file operations fail
  }
}

// Intercept original console methods in server environment
if (typeof window === 'undefined') {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => {
    originalLog(...args);
    appendLog('INFO', args);
  };

  console.error = (...args) => {
    originalError(...args);
    appendLog('ERROR', args);
  };

  console.warn = (...args) => {
    originalWarn(...args);
    appendLog('WARN', args);
  };
  
  console.log('[SYSTEM] Global server log stream initialized.');
}
