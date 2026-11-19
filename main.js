const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn, spawnSync } = require('child_process');
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

// ---------- optional audio download (needs yt-dlp and ffmpeg) ----------
const EXE = process.platform === 'win32' ? '.exe' : '';
const BROWSERS = ['firefox', 'chrome', 'edge', 'brave', 'none'];
function binDirs() {
  return [path.join(app.getPath('userData'), 'bin'), path.join(path.dirname(app.getPath('exe')), 'bin')];
}
function findTool(name) {
  for (const d of binDirs()) { const p = path.join(d, name + EXE); if (fs.existsSync(p)) return p; }
  return null;
}
function runs(cmd, arg) {
  try { const r = spawnSync(cmd, [arg], { timeout: 6000, windowsHide: true }); return !r.error && r.status === 0; } catch { return false; }
}
const toolPath = (name, arg) => findTool(name) || (runs(name, arg) ? name : null);

let dlProc = null, dlCancelled = false;
function killTree(p) {
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { windowsHide: true });
    else p.kill('SIGTERM');
  } catch {}
}

function friendly(line) {
  const l = String(line || '').replace(/^ERROR:\s*/, '').replace(/^\[[^\]]+\]\s*[\w-]*:?\s*/, '').trim();
  if (/cookie.*(database|copy|decrypt|find|locate)|could not (find|copy)|no such (file|profile)/i.test(line)) return 'could not read browser cookies. Press Tab to pick another browser, or "none".';
  if (/sign in|not a bot|confirm you/i.test(line)) return 'YouTube asked for sign-in. Sign in to YouTube in the browser chosen for cookies (Tab changes it), then try again.';
  if (/429|too many requests/i.test(line)) return 'too many requests. Wait a few minutes and try again.';
  if (/unavailable|private video|members-only|removed|not available in your country/i.test(line)) return 'video unavailable (private, removed, members only or region locked).';
  if (/ffmpeg|ffprobe/i.test(line)) return 'ffmpeg problem: ' + l.slice(0, 100);
  if (/unsupported url/i.test(line)) return 'that link is not supported.';
  return (l || 'download failed').slice(0, 140) + ' (try [u] to update yt-dlp)';
}

ipcMain.handle('dl:check', () => ({
  ytdlp: !!toolPath('yt-dlp', '--version'),
  ffmpeg: !!toolPath('ffmpeg', '-version'),
  binDir: binDirs()[0],
  folder: readCfg().lastFolder || null,
  cookies: readCfg().cookies || 'firefox'
}));
ipcMain.handle('dl:setcookies', (_e, b) => {
  if (BROWSERS.includes(b)) { const c = readCfg(); c.cookies = b; writeCfg(c); }
});
ipcMain.handle('dl:openbin', async () => {
  const d = binDirs()[0];
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
  await shell.openPath(d);
});
ipcMain.handle('dl:cancel', () => { if (dlProc) { dlCancelled = true; killTree(dlProc); } });
ipcMain.handle('dl:update', () => new Promise((resolve) => {
  const y = toolPath('yt-dlp', '--version');
  if (!y) return resolve({ ok: false, msg: 'yt-dlp not found' });
  let out = '', p;
  try { p = spawn(y, ['-U'], { windowsHide: true }); } catch { return resolve({ ok: false, msg: 'could not run yt-dlp' }); }
  const timer = setTimeout(() => { try { p.kill(); } catch {} }, 60000);
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { out += d; });
  p.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, msg: String(e.message).slice(0, 140) }); });
  p.on('close', (code) => {
    clearTimeout(timer);
    const line = out.trim().split(/\r?\n/).filter(Boolean).pop() || '';
    resolve({ ok: code === 0, msg: line.slice(0, 140) });
  });
}));

function buildArgs(folder, url, mode, browser, ffmpegDir) {
  const a = [];
  if (browser !== 'none') a.push('--cookies-from-browser', browser);
  a.push(mode === 'playlist' ? '--yes-playlist' : '--no-playlist');
  a.push('-x', '--audio-format', 'mp3', '--audio-quality', '0',
    '--embed-thumbnail', '--convert-thumbnails', 'jpg', '--embed-metadata',
    '--windows-filenames', '--newline', '--no-colors',
    '-P', folder,
    '-o', mode === 'playlist' ? '%(playlist_title)s/%(playlist_index)03d - %(title)s.%(ext)s' : '%(title)s.%(ext)s');
  if (ffmpegDir) a.push('--ffmpeg-location', ffmpegDir);
  a.push('--', url);
  return a;
}

// one yt-dlp run; resolves when the process exits
function runYtdlp(sender, y, args, st) {
  return new Promise((resolve) => {
    const send = (d) => { try { sender.send('dl:event', d); } catch {} };
    let buf = '', errLine = '', lastLine = '', errs = 0, proc;
    try { proc = spawn(y, args, { windowsHide: true }); }
    catch { return resolve({ code: -1, errLine: 'could not start yt-dlp', errs: 1 }); }
    dlProc = proc;
    const onLine = (line) => {
      let m;
      if ((m = line.match(/\[download\]\s+Downloading item (\d+) of (\d+)/))) send({ type: 'item', n: +m[1], total: +m[2] });
      else if ((m = line.match(/\[download\]\s+Downloading playlist: (.+)$/))) send({ type: 'playlist', name: m[1].trim() });
      else if ((m = line.match(/\[download\]\s+([\d.]+)%(?:.*?at\s+(\S+))?(?:.*?ETA\s+(\S+))?/))) send({ type: 'progress', pct: parseFloat(m[1]), speed: m[2] || '', eta: m[3] || '' });
      else if ((m = line.match(/\[ExtractAudio\] Destination: (.+)$/))) { st.files.push(path.resolve(st.folder, m[1].trim())); send({ type: 'stage', text: 'converting to mp3' }); }
      else if (/^\[EmbedThumbnail\]/.test(line)) send({ type: 'stage', text: 'adding cover art' });
      else if (/^\[Metadata\]/.test(line)) send({ type: 'stage', text: 'writing tags' });
    };
    proc.stdout.on('data', (d) => { buf += d.toString(); const parts = buf.split(/\r?\n|\r/); buf = parts.pop(); parts.forEach(onLine); });
    proc.stderr.on('data', (d) => {
      d.toString().split(/\r?\n/).filter(Boolean).forEach((s) => {
        lastLine = s;
        if (/^ERROR:/.test(s)) { errLine = s; errs++; }
      });
    });
    proc.on('error', (e) => resolve({ code: -1, errLine: e.code === 'ENOENT' ? 'yt-dlp not found' : String(e.message), errs: 1 }));
    proc.on('close', (code) => { if (buf) onLine(buf); resolve({ code, errLine: errLine || lastLine, errs }); });
  });
}

// tries the chosen browser's cookies first, then falls back so "just paste and go" works
async function runDownload(sender, y, ffmpegDir, folder, url, mode) {
  const send = (d) => { try { sender.send('dl:event', d); } catch {} };
  const pref = readCfg().cookies || 'firefox';
  const attempts = pref === 'none' ? ['none', 'firefox'] : [pref, 'none'];
  const st = { files: [], folder };
  let last = { code: -1, errLine: '', errs: 0 };
  for (let i = 0; i < attempts.length; i++) {
    const b = attempts[i];
    send({ type: 'stage', text: b === 'none' ? (i ? 'retrying without cookies' : 'starting') : (i ? 'retrying with ' + b + ' cookies' : 'using ' + b + ' cookies') });
    last = await runYtdlp(sender, y, buildArgs(folder, url, mode, b, ffmpegDir), st);
    if (dlCancelled || last.code === 0 || st.files.length) break;
  }
  dlProc = null;
  if (dlCancelled) send({ type: 'done', ok: false, error: 'cancelled', files: st.files });
  else if (last.code === 0 || st.files.length) send({ type: 'done', ok: true, files: st.files, failed: last.code === 0 ? 0 : last.errs });
  else send({ type: 'done', ok: false, error: friendly(last.errLine), files: [] });
}

ipcMain.handle('dl:start', (event, url, mode) => {
  if (dlProc) return { ok: false, error: 'a download is already running' };
  url = String(url || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(url)) return { ok: false, error: 'that is not a valid link' };
  mode = mode === 'playlist' ? 'playlist' : 'single';
  const folder = readCfg().lastFolder;
  if (!folder || !fs.existsSync(folder)) return { ok: false, error: 'choose a music folder first (press o)' };
  const y = toolPath('yt-dlp', '--version'), f = toolPath('ffmpeg', '-version');
  if (!y || !f) return { ok: false, error: 'yt-dlp or ffmpeg not found' };
  dlCancelled = false;
  runDownload(event.sender, y, path.isAbsolute(f) ? path.dirname(f) : null, folder, url, mode);
  return { ok: true };
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
