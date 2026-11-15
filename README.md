<p align="center">
  <img src="build/icon.png" width="96" height="96" alt="Tinto icon">
</p>

<h1 align="center">Tinto</h1>
<p align="center"><strong>Photo &amp; Image Editor</strong> for Windows and Linux, built with Electron.</p>

<p align="center">
  <a href="https://github.com/wellsey001/Tinto---Photo-Image-Editor/releases/latest"><img src="https://img.shields.io/github/v/release/wellsey001/Tinto---Photo-Image-Editor?label=Download&amp;color=efb34a" alt="Download the latest release"></a>
</p>

Tinto is a desktop photo editor in the spirit of Picsart: quick adjustments and filters, text and stickers on top, and a collage maker, all exported at full resolution.

## Download

Get Tinto from the **[latest release](https://github.com/wellsey001/Tinto---Photo-Image-Editor/releases/latest)**, under **Assets**:

| System | File |
| --- | --- |
| Windows 10 and 11 (64-bit) | `Tinto-Setup-<version>.exe` |
| Linux (64-bit), including Bazzite, Fedora, Ubuntu and SteamOS | `Tinto-<version>.AppImage` |

### Windows

1. Download **`Tinto-Setup-<version>.exe`**.
2. Run the installer and choose where to install Tinto. It adds Start menu and desktop shortcuts.
3. Windows may show a SmartScreen warning because the installer isn't code-signed yet. Choose **More info**, then **Run anyway**.

After installing, right-click any JPG, PNG, WebP, GIF or BMP in File Explorer and choose **Open with**, then **Tinto**.

### Linux

An AppImage is a single file that runs on most Linux distributions without installing anything.

1. Download **`Tinto-<version>.AppImage`**.
2. Make it runnable: right-click it, open **Properties**, and turn on **Allow executing as a program** (or **Is executable**). In a terminal: `chmod +x Tinto-*.AppImage`.
3. Double-click it to open Tinto.

To add Tinto to your app menu, with its icon and **Open with** for images, open the AppImage with **[Gear Lever](https://flathub.org/apps/it.mijorus.gearlever)**. On Bazzite it's in the Bazaar app store. Gear Lever also keeps the AppImage in one tidy place.

### Updates

From version 1.1.0, Tinto keeps itself up to date. It checks for a new version a few seconds after opening and every few hours after that, and downloads it in the background. This works on Windows and with the Linux AppImage. When it's ready, a bar appears in the bottom-right corner: choose **Restart and update** to install it straight away, or carry on and it installs the next time you close Tinto. You can also check at any time from **Help › Check for Updates…**.

If you have version 1.0.0 on Windows, download and run the newest installer once. It installs over the old version, and updates are automatic from then on.

## Features

- **Adjust:** exposure, brightness, contrast, highlights, shadows, saturation, vibrance, warmth, tint, hue, split tone, fade, vignette, grain and sharpness, with a live RGB histogram and clipping warning.
- **Auto:** one click sets light and colour to suit the photo.
- **Filters:** 25 presets, from Cinema and Portra to Lomo, Vintage and Silver, with live thumbnails and a strength slider.
- **Crop and rotate:** free or fixed ratios (1:1, 4:5, 3:2, 16:9, 9:16), rotate 90°, flip horizontal or vertical.
- **Resize:** by pixels or percentage, with high-quality step-down shrinking.
- **Text:** 14 fonts, 12 quick styles (including Neon, Sticker, Typewriter and Caption), colour, alignment, bold, letter spacing, outline, shadow, neon glow and background box.
- **Sticker packs:** 32 illustrated stickers in six themes (Food, Summer, Love, Party, Dreamy, Nature), with cute faces, white die-cut borders and a soft shadow. They're vector art, so they stay sharp at any size.
- **Stickers:** 25 vector shapes with colour, outline and drop shadow, plus 28 emoji.
- **Cheeky stickers (18+):** 20 rude word stickers (speech bubbles, bursts, stamps, pills and neon) and 15 naughty emoji. Hidden until you choose **Show** in Stickers.
- **Custom stickers:** import any image and turn it into a sticker. Remove the background with AI (runs on your computer; the model downloads once, about 25 MB), in one click for plain backgrounds, or by tapping a colour; touch up with erase and restore brushes; add a white or black sticker border. Saved stickers stay in **My stickers** for next time.
- **Draw:** freehand brush with a highlighter mode.
- **Layers:** move, resize and rotate on the photo; reorder, hide, duplicate and set opacity.
- **Collage:** 20 styled templates (Polaroids, Film strip, Magazine, Story, Scrapbook, Circles, Heart, Diagonal, Mood board, Postcard, Photo booth, Honeycomb, Gallery wall, Before & after, Pills, Card stack, Newspaper, Arches, Sticker sheet, Banner) with editable titles, plus 12 grid layouts for 2 to 9 photos with spacing, rounded corners and background colour. Template titles become editable text layers when you send a collage to the editor.
- **Before and after:** hold the compare button (or `\`) to see the original.
- **Undo and redo** for every edit.
- **Export** as JPG, PNG or WebP through your system's save dialog.
- **Watermark:** add your own text in the bottom-right corner in six styles (Pill, Minimal, Logo, Signature, Outline, Corner ribbon), with size and opacity. It previews live and is remembered for next time.
- **Open with Tinto** from your file manager for JPG, PNG, WebP, GIF and BMP files.
- **Automatic updates** on Windows and the Linux AppImage.

## Running from source

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/wellsey001/Tinto---Photo-Image-Editor.git
cd Tinto---Photo-Image-Editor
npm install
npm start
```

## Building

Windows installer (build on Windows):

```bash
npm run dist
```

The installer is written to `dist/Tinto-Setup-<version>.exe`. Run it to install Tinto with Start menu and desktop shortcuts, and to add Tinto to the "Open with" menu for images.

`npm run dist:dir` builds an unpacked app in `dist/win-unpacked/` without an installer, which is quicker for testing.

Linux AppImage (build on Linux):

```bash
npm run dist:linux
```

The AppImage is written to `dist/Tinto-<version>.AppImage`.

### Automatic builds on GitHub

The workflow in `.github/workflows/build.yml` builds the Windows installer on GitHub's Windows machines and the AppImage on its Linux machines:

- Every push to `main` and every pull request produces both as downloadable build artifacts.
- A new version tag attaches both, plus their update files, to its GitHub Release: `latest.yml` and the `.blockmap` for Windows, `latest-linux.yml` for Linux. Installed copies of Tinto read these to find updates, so keep them attached.

To release a new version, bump `version` in `package.json`, push it to `main`, then either publish a new release on GitHub with a tag such as `v1.3.0`, or push the tag yourself:

```bash
git tag v1.3.0
git push origin v1.3.0
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
│   ├── splash.html        Startup screen with the logo animation
│   ├── cutout.js          AI background removal for custom stickers (MODNet, runs locally)
│   ├── assets/icon.png    Window icon
│   └── renderer/
│       ├── index.html     Editor layout
│       ├── styles.css     Editor styles
│       ├── stickerpack.js Illustrated sticker pack (generated by scripts/make-stickers.py)
│       └── app.js         Editor: image processing, layers, collage, export
├── scripts/             Sticker pack generator and the AI cutout check
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
