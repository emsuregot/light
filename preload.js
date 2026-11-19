const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  pickFolder: () => ipcRenderer.invoke('folder:pick'),
  lastFolder: () => ipcRenderer.invoke('folder:last'),
  scan: (dir) => ipcRenderer.invoke('folder:scan', dir),
  loadTrack: (p) => ipcRenderer.invoke('track:load', p),
  onProgress: (cb) => ipcRenderer.on('scan:progress', (_e, d) => cb(d)),
  dlCheck: () => ipcRenderer.invoke('dl:check'),
  dlStart: (url, mode) => ipcRenderer.invoke('dl:start', url, mode),
  dlSetCookies: (b) => ipcRenderer.invoke('dl:setcookies', b),
  dlUpdate: () => ipcRenderer.invoke('dl:update'),
  dlCancel: () => ipcRenderer.invoke('dl:cancel'),
  dlOpenBin: () => ipcRenderer.invoke('dl:openbin'),
  onDl: (cb) => ipcRenderer.on('dl:event', (_e, d) => cb(d))
});
