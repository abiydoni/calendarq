import { app, BrowserWindow, ipcMain, Notification, Menu, shell, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import os from 'os';
import Store from 'electron-store';
import {
  getMachineId,
  checkLicenseStatus,
  activateLicense,
  deactivateLicense,
  registerUser,
} from './license.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* ────────────────── Encrypted Store ────────────────── */
// Encryption key is derived per-machine so the store file is not portable
const _machineId = getMachineId();
const _storeEncKey = crypto
  .createHash('sha256')
  .update('calendarq-enc-' + _machineId)
  .digest('hex')
  .substring(0, 32);

const store = new Store({ encryptionKey: _storeEncKey });
let mainWindow = null;

function createWindow() {
  const sizeMode = store.get('calendarq_size') || 'medium';
  let w = 360, h = 620; // default medium (fits calendar and 5 relaxed upcoming rows comfortably)
  if (sizeMode === 'small') { w = 325, h = 540; }
  else if (sizeMode === 'large') { w = 420, h = 710; }

  const windowOptions = {
    width: w,
    height: h,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    frame: false,       // frameless widget
    transparent: true,
    alwaysOnTop: false, // stays on desktop level
    resizable: false,
    skipTaskbar: true,  // widget-like: no taskbar entry
    show: false,
  };

  // Restore last window position if valid and visible on current display(s)
  const savedPos = store.get('calendarq_position');
  if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
    try {
      const displays = screen.getAllDisplays();
      const isVisible = displays.some(display => {
        const { x, y, width, height } = display.bounds;
        return (
          savedPos.x + 50 >= x &&
          savedPos.x <= x + width - 50 &&
          savedPos.y + 50 >= y &&
          savedPos.y <= y + height - 50
        );
      });
      if (isVisible) {
        windowOptions.x = Math.round(savedPos.x);
        windowOptions.y = Math.round(savedPos.y);
      }
    } catch {
      // Fallback to default centering if screen API encounters issues
    }
  }

  mainWindow = new BrowserWindow(windowOptions);

  const isDev = process.env.ELECTRON_DEV === '1';
  if (isDev) {
    const port = process.env.VITE_PORT || '5173';
    mainWindow.loadURL(`http://localhost:${port}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Disable DevTools in production to prevent easy license bypass
    if (!isDev) {
      mainWindow.webContents.on('devtools-opened', () => {
        mainWindow.webContents.closeDevTools();
      });
    }
  });

  // Automatically save position on move or close
  mainWindow.on('moved', () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      store.set('calendarq_position', { x, y });
    }
  });

  mainWindow.on('close', () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      store.set('calendarq_position', { x, y });
    }
  });

  // Auto-launch on startup (respects saved user setting)
  const autostart = store.get('calendarq_autostart') !== false;
  if (!isDev) {
    app.setLoginItemSettings({ openAtLogin: autostart, path: process.execPath });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

app.whenReady().then(async () => {
  if (process.argv.includes('--deactivate-on-uninstall')) {
    try {
      await deactivateLicense(store);
    } catch (e) {
      console.error('Uninstall deactivation failed:', e);
    }
    app.quit();
    return;
  }

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/* ────────────────── License heartbeat (every 24h) ────────────────── */
let _heartbeatInterval = null;
function startLicenseHeartbeat() {
  if (_heartbeatInterval) clearInterval(_heartbeatInterval);
  _heartbeatInterval = setInterval(async () => {
    try {
      const status = await checkLicenseStatus(store);
      if (status.status === 'expired' && mainWindow) {
        mainWindow.webContents.send('license-status-changed', status);
      }
    } catch { /* ignore network errors in heartbeat */ }
  }, 24 * 60 * 60 * 1000); // every 24 hours
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ────────────── IPC: electron-store ────────────── */
ipcMain.handle('store-get',    (_, key)      => store.get(key));
ipcMain.handle('store-set',    (_, key, val) => store.set(key, val));
ipcMain.handle('store-delete', (_, key)      => store.delete(key));

/* ────────────── IPC: License ────────────── */
ipcMain.handle('license-check', async () => {
  const status = await checkLicenseStatus(store);
  // Start heartbeat on first successful check
  if (!_heartbeatInterval) startLicenseHeartbeat();
  return status;
});

ipcMain.handle('license-activate', async (_, key) => {
  const result = await activateLicense(store, key);
  return result;
});

ipcMain.handle('license-deactivate', async () => {
  const result = await deactivateLicense(store);
  return result;
});

ipcMain.handle('license-get-machine-id', () => getMachineId());

ipcMain.handle('user-register', async (_, data) => registerUser(store, data));
ipcMain.handle('user-get-info', () => ({
  name: store.get('user_name') || '',
  email: store.get('user_email') || '',
  registered: store.get('user_registered') === true
}));

/* ────────────── IPC: Proxy HTTP fetch (holiday API, etc.) ────────────── */
ipcMain.handle('fetch-url', async (_, url) => {
  try {
    const res = await fetch(url);
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    return { ok: false, status: 0, text: '', error: err.message };
  }
});

/* ────────────── IPC: Fetch System Settings ────────────── */
ipcMain.handle('fetch-system-settings', async () => {
  try {
    // In production, this would point to the actual public domain.
    // Assuming local server for now since it's a self-hosted app.
    const url = 'http://localhost:3001/api/public/settings';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Settings fetch failed');
    const data = await res.json();
    return data?.settings || {};
  } catch (err) {
    console.error('Failed to fetch system settings:', err);
    return {};
  }
});

/* ────────────── IPC: Context Menu (Right-click) ────────────── */
ipcMain.handle('show-context-menu', (event, { isLocked } = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const locked = typeof isLocked === 'boolean' ? isLocked : (store.get('calendarq_locked') === true);
  const template = [
    {
      label: '📆 CalendarQ',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: locked ? '🔓 Buka Posisi (Unlock)' : '🔒 Kunci Posisi (Lock)',
      click: () => {
        const next = !locked;
        store.set('calendarq_locked', next);
        event.sender.send('context-menu-command', 'toggle-lock');
      },
    },
    { type: 'separator' },
    {
      label: '❌ Keluar (Quit)',
      click: () => app.quit(),
    },
  ];
  Menu.buildFromTemplate(template).popup({ window: win });
});

/* ────────────── IPC: Native Notifications ────────────── */
ipcMain.handle('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show();
  }
});

/* ────────────── IPC: Move Window ────────────── */
ipcMain.handle('move-window', (event, { dx, dy }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const [x, y] = win.getPosition();
    const newX = x + dx;
    const newY = y + dy;
    win.setPosition(newX, newY);
    store.set('calendarq_position', { x: newX, y: newY });
  }
});

/* ────────────── IPC: Auto-Start On Boot ────────────── */
ipcMain.handle('get-autostart', () => {
  return store.get('calendarq_autostart') !== false;
});

ipcMain.handle('set-autostart', (_, enabled) => {
  store.set('calendarq_autostart', enabled);
  const isDev = process.env.ELECTRON_DEV === '1';
  if (!isDev) {
    app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath });
  }
  return enabled;
});

/* ────────────── IPC: Open External Link ────────────── */
ipcMain.handle('open-external-link', (_, url) => {
  shell.openExternal(url);
});

/* ────────────── IPC: Window Resize ────────────── */
ipcMain.handle('resize-window', (event, { width, height }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const targetW = Math.round(width);
    const targetH = Math.round(height);
    const [curW, curH] = win.getSize();
    if (curW !== targetW || curH !== targetH) {
      win.setResizable(true);
      const [curX, curY] = win.getPosition();
      try {
        const currentDisplay = screen.getDisplayNearestPoint({ x: curX, y: curY });
        const maxY = currentDisplay.workArea.y + currentDisplay.workArea.height;
        if (curY + targetH > maxY) {
          const newY = Math.max(currentDisplay.workArea.y, maxY - targetH);
          win.setPosition(curX, newY);
          store.set('calendarq_position', { x: curX, y: newY });
        }
      } catch (e) {}
      win.setSize(targetW, targetH);
      win.setResizable(false);
    }
  }
});

/* ────────────── IPC: Date Context Menu ────────────── */
ipcMain.handle('show-date-context-menu', (event, { dateStr, isLocked } = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const locked = typeof isLocked === 'boolean' ? isLocked : (store.get('calendarq_locked') === true);
  const template = [
    {
      label: '➕ Tambah Acara',
      click: () => event.sender.send('date-context-command', { command: 'add-event', dateStr }),
    },
    { type: 'separator' },
    {
      label: locked ? '🔓 Buka Posisi (Unlock)' : '🔒 Kunci Posisi (Lock)',
      click: () => {
        const next = !locked;
        store.set('calendarq_locked', next);
        event.sender.send('context-menu-command', 'toggle-lock');
      },
    },
    { type: 'separator' },
    {
      label: '❌ Keluar (Quit)',
      click: () => app.quit(),
    },
  ];
  Menu.buildFromTemplate(template).popup({ window: win });
});

