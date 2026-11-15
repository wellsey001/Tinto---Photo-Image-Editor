// Tinto - Photo & Image Editor: main process.
// Owns the window, native open/save dialogs, the app menu, and files opened
// from File Explorer ("Open with Tinto" or double-clicking an associated image).

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
const SAVE_FILTERS = {
  jpg: { name: 'JPEG image', extensions: ['jpg', 'jpeg'] },
  png: { name: 'PNG image', extensions: ['png'] },
  webp: { name: 'WebP image', extensions: ['webp'] },
};
const MAX_OPEN_BYTES = 200 * 1024 * 1024; // refuse anything over 200 MB

let win = null;
let startupFile = findImageArg(process.argv);

// The loading screen plays its 1.8-second logo animation, then hands over to the editor
// (a quick start still gets the whole animation; a slow one keeps the logo up until the editor is ready).
const SPLASH_MS = 1800;
let splash = null;
let splashShownAt = 0;
let editorWaiting = false;

function createSplash() {
  splash = new BrowserWindow({
    width: 460,
    height: 340,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    center: true,
    show: false,
    backgroundColor: '#00000000',
    title: 'Tinto',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
  splash.once('ready-to-show', () => {
    if (!splash || splash.isDestroyed()) return;
    if (win && !win.isDestroyed() && win.isVisible()) { splash.destroy(); return; } // the editor beat it
    splash.show();
    splashShownAt = Date.now();
    if (editorWaiting) revealEditor();
  });
  // If the loading screen itself can't start, the editor doesn't wait for it.
  setTimeout(() => { if (!splashShownAt && editorWaiting) { if (splash && !splash.isDestroyed()) splash.destroy(); revealEditor(); } }, 1500);
  splash.on('closed', () => { splash = null; });
}

// Shows the editor once the animation has finished, then lets the loading screen fade away.
function revealEditor() {
  if (!win || win.isDestroyed() || win.isVisible()) return;
  // The editor was quicker than the loading screen: wait for it, so the animation still plays.
  if (splash && !splash.isDestroyed() && !splashShownAt) { editorWaiting = true; return; }
  editorWaiting = false;
  const wait = splash && splashShownAt ? Math.max(0, SPLASH_MS - (Date.now() - splashShownAt)) : 0;
  setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    win.maximize();
    win.show();
    win.focus();
    const s = splash;
    if (!s || s.isDestroyed()) return;
    s.webContents.executeJavaScript("document.body.classList.add('leaving')").catch(() => {});
    setTimeout(() => { if (!s.isDestroyed()) s.destroy(); }, 200);
  }, wait);
}

/** Find an image path in a command line (first launch or a second instance). */
function findImageArg(argv) {
  const args = argv.slice(app.isPackaged ? 1 : 2);
  return args.find(a => !a.startsWith('-') && IMAGE_EXTS.includes(path.extname(a).slice(1).toLowerCase())) || null;
}

async function readImage(filePath) {
  const stat = await fs.stat(filePath);
  if (stat.size > MAX_OPEN_BYTES) throw new Error('File is larger than 200 MB.');
  const data = await fs.readFile(filePath);
  return { name: path.basename(filePath), path: filePath, data };
}

async function sendFileToWindow(filePath) {
  if (!win) return;
  try {
    win.webContents.send('open-file', await readImage(filePath));
  } catch (err) {
    dialog.showErrorBox('Couldn’t open the image', `${path.basename(filePath)}\n\n${err.message}`);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#121316',
    title: 'Tinto - Photo & Image Editor',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', revealEditor);
  win.on('closed', () => { win = null; });

  // Keep the app on its own page: links open in the default browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', e => e.preventDefault());

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function buildMenu() {
  const send = action => () => win && win.webContents.send('menu', action);
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open Photo…', accelerator: 'CmdOrCtrl+O', click: send('open') },
        { label: 'Export…', accelerator: 'CmdOrCtrl+E', click: send('export') },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Check for Updates…', click: send('check-updates') },
        { label: 'Tinto on GitHub', click: () => shell.openExternal('https://github.com/wellsey001/Tinto---Photo-Image-Editor') },
        { type: 'separator' },
        {
          label: 'About Tinto',
          click: () => dialog.showMessageBox(win, {
            type: 'info',
            title: 'About Tinto',
            message: 'Tinto - Photo & Image Editor',
            detail: `Version ${app.getVersion()}\nElectron ${process.versions.electron}`,
          }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---------- IPC: what the editor can ask the main process to do ---------- */

// The editor asks once it has loaded, so a file passed on the command line isn't missed.
ipcMain.handle('startup-file', async () => {
  if (!startupFile) return null;
  const p = startupFile;
  startupFile = null;
  try { return await readImage(p); } catch { return null; }
});

ipcMain.handle('open-images', async (_e, opts) => {
  const multi = !!(opts && opts.multi);
  const res = await dialog.showOpenDialog(win, {
    title: multi ? 'Add photos' : 'Open photo',
    properties: multi ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: [{ name: 'Images', extensions: IMAGE_EXTS }],
  });
  if (res.canceled) return [];
  const files = [];
  for (const p of res.filePaths) {
    try { files.push(await readImage(p)); } catch { /* skipped; the editor reports unreadable files */ }
  }
  return files;
});

ipcMain.handle('save-image', async (_e, req) => {
  if (!req || typeof req.name !== 'string' || !(req.data instanceof Uint8Array)) {
    return { saved: false, error: 'Nothing to save.' };
  }
  const ext = SAVE_FILTERS[req.ext] ? req.ext : 'png';
  const res = await dialog.showSaveDialog(win, {
    title: 'Export',
    defaultPath: path.join(app.getPath('pictures'), path.basename(req.name)),
    filters: [SAVE_FILTERS[ext]],
  });
  if (res.canceled || !res.filePath) return { saved: false, canceled: true };
  try {
    await fs.writeFile(res.filePath, req.data);
    return { saved: true, path: res.filePath };
  } catch (err) {
    return { saved: false, error: err.message };
  }
});

ipcMain.handle('show-in-folder', (_e, filePath) => {
  if (typeof filePath === 'string') shell.showItemInFolder(filePath);
});

/* ---------- updates for the installed app (GitHub Releases, via electron-updater) ---------- */
// Tinto checks a few seconds after opening and every few hours after that. A new version
// downloads in the background; the editor then shows a bar with a button to restart and install.
// Running from the project folder (npm start), updates are off.

let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch { /* not installed yet: no auto-updates */ }
let updateState = { state: app.isPackaged && autoUpdater ? 'idle' : 'off' };
const UPDATE_EVERY_MS = 4 * 60 * 60 * 1000;

function sendUpdate(s) {
  updateState = s;
  if (win && !win.isDestroyed()) win.webContents.send('update:status', s);
}

function setupUpdates() {
  if (!autoUpdater || !app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'current' }));
  autoUpdater.on('update-available', info => sendUpdate({ state: 'downloading', version: info.version, progress: 0 }));
  autoUpdater.on('download-progress', p => sendUpdate({ ...updateState, state: 'downloading', progress: p.percent / 100 }));
  autoUpdater.on('update-downloaded', info => sendUpdate({ state: 'ready', version: info.version }));
  autoUpdater.on('error', err => sendUpdate({ state: 'error', message: String(err && err.message ? err.message : err).split('\n')[0] }));
  const check = () => { if (updateState.state !== 'downloading' && updateState.state !== 'ready') autoUpdater.checkForUpdates().catch(() => {}); };
  setTimeout(check, 4000);
  setInterval(check, UPDATE_EVERY_MS);
}

ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('update:state', () => updateState);
ipcMain.handle('update:check', async () => {
  if (!autoUpdater || !app.isPackaged) return { state: 'off' };
  if (updateState.state === 'downloading' || updateState.state === 'ready') return updateState;
  try { await autoUpdater.checkForUpdates(); } catch { /* reported through the error event */ }
  return updateState;
});

// Installing: the installer runs silently with the choices made the first time
// (where Tinto is installed), then the new version opens by itself.
let installingUpdate = false;
ipcMain.handle('update:install', async (_e, opts) => {
  if (!autoUpdater || installingUpdate || updateState.state !== 'ready') return { ok: false };
  if (opts && opts.hasEdits && win && !win.isDestroyed()) {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Update now', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      message: 'Export your photo first?',
      detail: 'Tinto closes to install the update, and edits you haven’t exported will be lost. To keep them, cancel and press Ctrl+E to export.',
    });
    if (choice === 1) return { ok: false, cancelled: true };
  }
  installingUpdate = true;
  autoUpdater.quitAndInstall(true, true);
  return { ok: true };
});

/* ---------- app lifecycle ---------- */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Opening another image from Explorer while Tinto is running reuses this window.
  app.on('second-instance', (_e, argv) => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    const f = findImageArg(argv);
    if (f) sendFileToWindow(f);
  });

  app.whenReady().then(() => {
    buildMenu();
    createSplash();
    createWindow();
    setupUpdates();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
