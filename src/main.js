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

  win.once('ready-to-show', () => { win.maximize(); win.show(); });
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
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
