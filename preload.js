const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  pickFolder: () => ipcRenderer.invoke('folder:pick'),
  lastFolder: () => ipcRenderer.invoke('folder:last'),
  scan: (dir) => ipcRenderer.invoke('folder:scan', dir),
  loadTrack: (p) => ipcRenderer.invoke('track:load', p),
  onProgress: (cb) => ipcRenderer.on('scan:progress', (_e, d) => cb(d))
});
