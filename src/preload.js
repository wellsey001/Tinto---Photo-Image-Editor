// Tinto preload: the only bridge between the editor page and the main process.
// The page gets a small, fixed set of calls under window.tinto and nothing else.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tinto', {
  /** Ask for a file passed on the command line at launch. Resolves to {name, path, data} or null. */
  startupFile: () => ipcRenderer.invoke('startup-file'),

  /** Show the native open dialog. Resolves to an array of {name, path, data}. */
  openImages: (multi = false) => ipcRenderer.invoke('open-images', { multi }),

  /** Show the native save dialog and write the bytes. Resolves to {saved, path?, canceled?, error?}. */
  saveImage: (name, data, ext) => ipcRenderer.invoke('save-image', { name, data, ext }),

  /** Reveal a saved file in File Explorer. */
  showInFolder: filePath => ipcRenderer.invoke('show-in-folder', filePath),

  /** Images opened from Explorer while Tinto is already running. */
  onOpenFile: cb => ipcRenderer.on('open-file', (_e, file) => cb(file)),

  /** Menu commands: 'open', 'export' or 'check-updates'. */
  onMenu: cb => ipcRenderer.on('menu', (_e, action) => cb(action)),

  /** My stickers: custom stickers saved as PNGs. list() resolves to [{id, data}]. */
  stickers: {
    list: () => ipcRenderer.invoke('stickers:list'),
    save: (id, data) => ipcRenderer.invoke('stickers:save', { id, data }),
    remove: id => ipcRenderer.invoke('stickers:delete', id),
  },

  /** AI background removal: RGB bytes in, a 0-255 subject mask out. */
  removeBackground: (rgb, w, h) => ipcRenderer.invoke('sticker:remove-bg', { rgb, w, h }),
  onRemoveBgProgress: cb => {
    const handler = (_e, p) => cb(p);
    ipcRenderer.on('sticker:remove-bg-progress', handler);
    return () => ipcRenderer.removeListener('sticker:remove-bg-progress', handler);
  },

  /** Tinto's version number, e.g. "1.1.0". */
  appVersion: () => ipcRenderer.invoke('app:version'),

  /** Updates: state is idle | checking | current | downloading | ready | error | off. */
  updateState: () => ipcRenderer.invoke('update:state'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: hasEdits => ipcRenderer.invoke('update:install', { hasEdits: !!hasEdits }),
  onUpdateStatus: cb => ipcRenderer.on('update:status', (_e, s) => cb(s)),
});
