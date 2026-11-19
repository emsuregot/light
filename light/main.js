const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');

const MIME = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.flac': 'audio/flac',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.aac': 'audio/aac'
};
let win;

const cfgFile = () => path.join(app.getPath('userData'), 'config.json');
function readCfg() { try { return JSON.parse(fs.readFileSync(cfgFile(), 'utf8')); } catch { return {}; } }
function writeCfg(c) { try { fs.writeFileSync(cfgFile(), JSON.stringify(c)); } catch {} }

async function walk(dir, out = []) {
  let entries;
  try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (MIME[path.extname(e.name).toLowerCase()]) out.push(p);
  }
  return out;
}

function coverOf(common) {
  const pic = mm.selectCover(common.picture);
  return pic ? `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}` : null;
}

async function readMeta(file, covers) {
  const base = path.basename(file, path.extname(file));
  const out = {
    path: file, title: base, artist: '', album: '', year: '', genre: '', track: '',
    duration: 0, bitrate: 0, sampleRate: 0, codec: '', channels: 0, size: 0, cover: null
  };
  try { out.size = (await fs.promises.stat(file)).size; } catch {}
  try {
    const m = await mm.parseFile(file, { skipCovers: !covers, duration: true });
    const c = m.common, f = m.format;
    out.title = c.title || base;
    out.artist = c.artist || '';
    out.album = c.album || '';
    out.year = c.year ? String(c.year) : '';
    out.genre = c.genre ? c.genre.join(', ') : '';
    out.track = c.track && c.track.no ? (c.track.of ? `${c.track.no}/${c.track.of}` : String(c.track.no)) : '';
    out.duration = f.duration || 0;
    out.bitrate = f.bitrate ? Math.round(f.bitrate / 1000) : 0;
    out.sampleRate = f.sampleRate || 0;
    out.codec = f.codec || f.container || '';
    out.channels = f.numberOfChannels || 0;
    if (covers) out.cover = coverOf(c);
  } catch {}
  return out;
}

ipcMain.handle('folder:last', () => {
  const dir = readCfg().lastFolder;
  return dir && fs.existsSync(dir) ? dir : null;
});

ipcMain.handle('folder:pick', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'], title: 'Select music folder' });
  if (r.canceled || !r.filePaths[0]) return null;
  const cfg = readCfg(); cfg.lastFolder = r.filePaths[0]; writeCfg(cfg);
  return r.filePaths[0];
});

ipcMain.handle('folder:scan', async (event, dir) => {
  const files = (await walk(dir)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const out = [];
  const BATCH = 8;
  for (let i = 0; i < files.length; i += BATCH) {
    const part = await Promise.all(files.slice(i, i + BATCH).map(f => readMeta(f, false)));
    out.push(...part);
    event.sender.send('scan:progress', { done: out.length, total: files.length });
  }
  return out;
});

ipcMain.handle('track:load', async (_e, file) => {
  const data = await fs.promises.readFile(file);
  const meta = await readMeta(file, true);
  return { data, mime: MIME[path.extname(file).toLowerCase()] || 'audio/mpeg', cover: meta.cover };
});

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 740, minWidth: 820, minHeight: 520,
    backgroundColor: '#000000', title: 'light', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
