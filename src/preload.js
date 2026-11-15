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

  /** Menu commands: 'open' or 'export'. */
  onMenu: cb => ipcRenderer.on('menu', (_e, action) => cb(action)),
});
