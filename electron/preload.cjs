const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, val) => ipcRenderer.invoke('store-set', key, val),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  showContextMenu: (isLocked) => ipcRenderer.invoke('show-context-menu', { isLocked }),
  onContextMenuCommand: (callback) => {
    const handler = (event, command) => callback(command);
    ipcRenderer.on('context-menu-command', handler);
    return () => ipcRenderer.removeListener('context-menu-command', handler);
  },
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', { width, height }),
  showDateContextMenu: (dateStr, isLocked) => ipcRenderer.invoke('show-date-context-menu', { dateStr, isLocked }),
  onDateContextCommand: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('date-context-command', handler);
    return () => ipcRenderer.removeListener('date-context-command', handler);
  },
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
  moveWindow: (dx, dy) => ipcRenderer.invoke('move-window', { dx, dy }),
  getAutoStart: () => ipcRenderer.invoke('get-autostart'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-autostart', enabled),
  fetchUrl: (url) => ipcRenderer.invoke('fetch-url', url),
  fetchSystemSettings: () => ipcRenderer.invoke('fetch-system-settings'),

  /* ── License & User Registration ── */
  licenseCheck: () => ipcRenderer.invoke('license-check'),
  licenseActivate: (key) => ipcRenderer.invoke('license-activate', key),
  licenseDeactivate: () => ipcRenderer.invoke('license-deactivate'),
  licenseGetMachineId: () => ipcRenderer.invoke('license-get-machine-id'),
  userRegister: (data) => ipcRenderer.invoke('user-register', data),
  userGetInfo: () => ipcRenderer.invoke('user-get-info'),
  onLicenseStatusChanged: (callback) => {
    const handler = (event, status) => callback(status);
    ipcRenderer.on('license-status-changed', handler);
    return () => ipcRenderer.removeListener('license-status-changed', handler);
  },
});
