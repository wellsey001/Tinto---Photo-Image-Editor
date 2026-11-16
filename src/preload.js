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

  /** Save a Tinto project. With a path Tinto opened or saved before, writes there; otherwise asks. Resolves to {saved, path?, canceled?, error?}. */
  saveProject: (name, data, path) => ipcRenderer.invoke('project:save', { name, data, path }),

  /** Reveal a saved file in File Explorer. */
  showInFolder: filePath => ipcRenderer.invoke('show-in-folder', filePath),

  /** Images opened from Explorer while Tinto is already running. */
  onOpenFile: cb => ipcRenderer.on('open-file', (_e, file) => cb(file)),

  /** Menu commands: 'open', 'save', 'save-as', 'export' or 'check-updates'. */
  onMenu: cb => ipcRenderer.on('menu', (_e, action) => cb(action)),

  /** Recent photos and projects: list() resolves to [{path, name, at}]; open(path) opens one. */
  recent: {
    list: () => ipcRenderer.invoke('recent:list'),
    open: p => ipcRenderer.invoke('recent:open', p),
    clear: () => ipcRenderer.invoke('recent:clear'),
    onChange: cb => ipcRenderer.on('recent-changed', () => cb()),
  },

  /** Autosave of the work in progress: write(bytes, {name, path, thumb}), read() -> {meta, data} or null, clear(). */
  autosave: {
    write: (data, meta) => ipcRenderer.invoke('autosave:write', { data, meta }),
    read: () => ipcRenderer.invoke('autosave:read'),
    clear: () => ipcRenderer.invoke('autosave:clear'),
    /** Tinto is about to close: save now, then call done(). */
    onFlush: cb => ipcRenderer.on('flush-autosave', () => Promise.resolve(cb()).catch(() => {}).finally(() => ipcRenderer.send('autosave:flushed'))),
  },

  /** Puts a PNG (bytes) on the system clipboard so it can be pasted into other apps. Resolves true on success. */
  copyImage: data => ipcRenderer.invoke('clipboard:write-image', data),

  /** My stickers: custom stickers saved as PNGs. list() resolves to [{id, data}]. */
  stickers: {
    list: () => ipcRenderer.invoke('stickers:list'),
    save: (id, data) => ipcRenderer.invoke('stickers:save', { id, data }),
    remove: id => ipcRenderer.invoke('stickers:delete', id),
  },

  /** AI background removal: RGB bytes in, a 0-255 subject mask out. */
  removeBackground: (rgb, w, h) => ipcRenderer.invoke('sticker:remove-bg', { rgb, w, h }),
  skyMask: (rgb, w, h) => ipcRenderer.invoke('photo:sky-mask', { rgb, w, h }),
  upscale: (rgb, w, h, f) => ipcRenderer.invoke('photo:upscale', { rgb, w, h, f }),
  cancelUpscale: () => ipcRenderer.send('photo:upscale-cancel'),
  onUpscaleProgress: cb => {
    const h = (_e, p) => cb(p);
    ipcRenderer.on('photo:upscale-progress', h);
    return () => ipcRenderer.removeListener('photo:upscale-progress', h);
  },
  onSkyProgress: cb => {
    const h = (_e, p) => cb(p);
    ipcRenderer.on('photo:sky-progress', h);
    return () => ipcRenderer.removeListener('photo:sky-progress', h);
  },
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
