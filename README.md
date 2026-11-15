<p align="center">
  <img src="build/icon.png" width="96" height="96" alt="Tinto icon">
</p>

<h1 align="center">Tinto</h1>
<p align="center"><strong>Photo &amp; Image Editor</strong> for Windows, built with Electron.</p>

<p align="center">
  <a href="https://github.com/wellsey001/Tinto---Photo-Image-Editor/releases/latest"><img src="https://img.shields.io/github/v/release/wellsey001/Tinto---Photo-Image-Editor?label=Download&amp;color=efb34a" alt="Download the latest release"></a>
</p>

Tinto is a desktop photo editor in the spirit of Picsart: quick adjustments and filters, text and stickers on top, and a collage maker, all exported at full resolution.

## Download

**[Download Tinto for Windows](https://github.com/wellsey001/Tinto---Photo-Image-Editor/releases/latest)** (Windows 10 and 11, 64-bit)

1. On the latest release page, download **`Tinto-Setup-<version>.exe`** under **Assets**.
2. Run the installer and choose where to install Tinto. It adds Start menu and desktop shortcuts.
3. Windows may show a SmartScreen warning because the installer isn't code-signed yet. Choose **More info**, then **Run anyway**.

After installing, right-click any JPG, PNG, WebP, GIF or BMP in File Explorer and choose **Open with**, then **Tinto**.

### Updates

From version 1.1.0, Tinto keeps itself up to date. It checks for a new version a few seconds after opening and every few hours after that, and downloads it in the background. When it's ready, a bar appears in the bottom-right corner: choose **Restart and update** to install it straight away, or carry on and it installs the next time you close Tinto. You can also check at any time from **Help › Check for Updates…**.

If you have version 1.0.0, download and run the newest installer once. It installs over the old version, and updates are automatic from then on.

## Features

- **Adjust:** exposure, brightness, contrast, highlights, shadows, saturation, warmth, tint, fade, vignette and sharpness, with a live RGB histogram and clipping warning.
- **Filters:** 12 presets with live thumbnails and a strength slider.
- **Crop and rotate:** free or fixed ratios (1:1, 4:5, 3:2, 16:9, 9:16), rotate 90°, flip horizontal or vertical.
- **Resize:** by pixels or percentage, with high-quality step-down shrinking.
- **Text:** 10 fonts, six quick styles, colour, alignment, bold, outline, shadow and background box.
- **Stickers:** 12 vector shapes with colour, outline and drop shadow.
- **Draw:** freehand brush with a highlighter mode.
- **Layers:** move, resize and rotate on the photo; reorder, hide, duplicate and set opacity.
- **Collage:** 12 layouts for 2 to 9 photos, five shapes, spacing, rounded corners and background colour.
- **Before and after:** hold the compare button (or `\`) to see the original.
- **Undo and redo** for every edit.
- **Export** as JPG, PNG or WebP through the Windows save dialog.
- **Open with Tinto** from File Explorer for JPG, PNG, WebP, GIF and BMP files.

## Running from source

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/wellsey001/Tinto---Photo-Image-Editor.git
cd Tinto---Photo-Image-Editor
npm install
npm start
```

## Building the Windows installer

```bash
npm run dist
```

The installer is written to `dist/Tinto-Setup-<version>.exe`. Run it to install Tinto with Start menu and desktop shortcuts, and to add Tinto to the "Open with" menu for images.

`npm run dist:dir` builds an unpacked app in `dist/win-unpacked/` without an installer, which is quicker for testing.

### Automatic builds on GitHub

The workflow in `.github/workflows/build.yml` builds the installer on GitHub's Windows machines:

- Every push to `main` and every pull request produces the installer as a downloadable build artifact.
- A new version tag attaches the installer and the update files (`latest.yml` and the `.blockmap`) to its GitHub Release. Installed copies of Tinto read `latest.yml` to find updates, so keep it attached.

To release a new version, bump `version` in `package.json`, push it to `main`, then either publish a new release on GitHub with a tag such as `v1.1.0`, or push the tag yourself:

```bash
git tag v1.1.0
git push origin v1.1.0
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl+O | Open a photo |
| Ctrl+E | Export |
| Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y | Undo / redo |
| Hold `\` | Compare with the original |
| Delete | Remove the selected layer, or the selected collage photo |
| Ctrl+D | Duplicate the selected layer |
| Shift while rotating | Snap to 15° steps |
| Esc | Deselect |

## Project structure

```
tinto/
├── build/                 Icons used by the installer (icon.ico, icon.png)
├── src/
│   ├── main.js            Main process: window, menu, native open/save, Explorer files
│   ├── preload.js         The small, fixed bridge the editor page can call (window.tinto)
│   ├── assets/icon.png    Window icon
│   └── renderer/
│       ├── index.html     Editor layout
│       ├── styles.css     Editor styles
│       └── app.js         Editor: image processing, layers, collage, export
├── .github/workflows/     GitHub Actions build
└── package.json           Scripts and electron-builder settings
```

The editor page runs with context isolation, the sandbox on and Node integration off. It can only reach the main process through the calls in `preload.js`.

## Notes

- Fonts load from Google Fonts. Offline, Tinto falls back to system fonts until it next has a connection.
- The installer isn't code-signed, so Windows SmartScreen may warn on first install. Choose **More info**, then **Run anyway**.
- `src/renderer/index.html` also opens in a normal browser for quick UI work. There, Export shows the image to save manually instead of a save dialog.

## Roadmap

- One-tap background removal, running locally
- Object eraser
- Recent files and autosave
- Bundled fonts for full offline use

## Licence

[MIT](LICENSE)
