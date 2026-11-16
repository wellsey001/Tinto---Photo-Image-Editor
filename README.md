<p align="center">
  <img src="docs/logo-animated.svg" width="128" height="128" alt="Tinto logo: the slider knob glides left and back while the eye watches it and blinks">
</p>

<h1 align="center">Tinto</h1>
<p align="center"><strong>Photo &amp; Image Editor</strong> for Windows and Linux, built with Electron.</p>

<p align="center"><a href="https://wellsey001.github.io/Tinto---Photo-Image-Editor/"><strong>Website</strong></a></p>

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
| Android 6 and newer (phones and tablets) | `Tinto-<version>.apk` |

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

### Android

1. On your phone, open the **[latest release](https://github.com/wellsey001/Tinto---Photo-Image-Editor/releases/latest)** and tap **`Tinto-<version>.apk`** under **Assets**.
2. Open the downloaded file. The first time, Android asks to allow your browser (or Files app) to **install unknown apps**: tap **Settings**, turn it on, then go back and tap **Install**.
3. Open Tinto from your app drawer.

On a phone the photo sits at the top, the tool's controls slide up underneath it (tap the open tool again to fold them away), and all the tools are in the bar along the bottom. Pinch and twist with two fingers to resize and rotate stickers and text; pinch the photo itself to zoom in; long-press for the menu. **Export** saves to your gallery (**Pictures › Tinto**) or opens the share sheet; projects save to **Documents › Tinto**.

The AI tools (Background, Sky and the AI cutout for custom stickers) run on the phone too: each model downloads once, the first time you use it, so you'll need a connection then. Tinto checks for a newer version once a day and shows a **Download** bar when there is one (or long-press the photo › **Check for updates**). Open the downloaded APK and tap **Install**; it installs over the old one and keeps your stickers.

### Updates

From version 1.1.0, Tinto keeps itself up to date. It checks for a new version a few seconds after opening and every few hours after that, and downloads it in the background. This works on Windows and with the Linux AppImage. When it's ready, a bar appears in the bottom-right corner: choose **Restart and update** to install it straight away (the Tinto splash plays while it installs, and the new version opens by itself with "Updated to version …"), or carry on and it installs the next time you close Tinto. You can also check at any time from **Help › Check for Updates…**.

If you have version 1.0.0 on Windows, download and run the newest installer once. It installs over the old version, and updates are automatic from then on.

## Features

- **Adjust:** exposure, brightness, contrast, highlights, shadows, saturation, vibrance, warmth, tint, hue, split tone, fade, vignette, grain and sharpness, with a live RGB histogram and clipping warning.
- **Auto:** one click sets light and colour to suit the photo.
- **Filters:** 33 presets, from Cinema and Portra to Lomo, Vintage and Silver, with live thumbnails and a strength slider.
- **Hex it:** one tap gives the photo a dark, alternative look (a filter, an effect and a frame that go together), picked to suit the photo. Tap again for another.
- **Your looks:** save the adjustments, filter, effect and frame you've set as a named look and put it on any photo in one tap. Handy for keeping a whole shoot consistent.
- **Dark & alternative pack:** for goths, emos, metalheads and the people who photograph, tattoo and promote them.
  - Filters: Crypt, Bloodmoon, Noir Lace, Scene Kid, Cassette, Doom, Witch House, Ghost and Ink.
  - Effects: Grunge, Xerox, VHS (with a date stamp), Smoke, Infrared, Chroma, Blood (paint drips) and Eye glow (tap the eyes; red, white, ice, violet or gold).
  - Frames: Gothic, Barbed wire, Burnt, Cracked, Coffin and Cameo.
  - 18 stickers in a Dark pack (bat, skull, rose, raven, coffin, candle, chain, safety pin and more) and four fonts: Blackletter, Metal Mania, Creepster and Nosifer.
  - Templates for work: Gig poster, Punk zine, Club night, Band promo, Setlist, Flash day, Photo credits and Merch mockup, plus a Fresh & healed tattoo collage.
  - Text made for this photo suggests darker words and fonts once a dark look is on.
- **Crop and rotate:** free or fixed ratios (1:1, 4:5, 3:2, 16:9, 9:16), rotate 90°, flip horizontal or vertical.
- **Resize:** by pixels or percentage, with high-quality step-down shrinking.
- **Text:** 18 fonts, 12 quick styles (including Neon, Sticker, Typewriter and Caption), colour, alignment, bold, letter spacing, outline, shadow, neon glow and background box.
- **Text made for this photo:** at the top of Text, six ready-made styles worked out from your photo: fonts that suit its mood (night, warm, pastel, green…), colours taken from the photo that stand out where the words go, and a spot where they read well. **Match photo** recolours selected text the same way; press again for another colour.
- **Projects:** File → Save Project (Ctrl+S) saves a `.tinto` file with the photo and every layer still editable. Open it again (double-click it, or Open photo) to carry on later.
- **Retouch:** brush away blemishes, smooth skin (edges like eyes and hair stay sharp) and whiten teeth.
- **AI upscale:** in Resize, make a small or soft photo 2× or 4× bigger with real added detail (Swin2SR, running on your device; the models are 8 MB and 21 MB, downloaded the first time). Shows progress and time left, and can be cancelled. Works on photos up to 1600 px (2×) or 800 px (4×) across on a computer, smaller on a phone.
- **Object eraser:** in Retouch, choose Erase object and paint over something you don't want (a stranger in the background, a bin, a wire). Let go and it's filled in from the rest of the photo. Works on your computer or phone, no internet needed.
- **Frames:** 17 frames (Border, Rounded, Polaroid, Gallery, Film, Stamp, Scallop, Stitched, Soft edge, Neon, Gold, Gothic, Barbed wire, Burnt, Cracked, Coffin, Cameo) with colour and thickness. They sit over the photo's edges, under text and stickers, and filters don't tint them.
- **Social sizes:** one click for Instagram post or portrait, Story/TikTok, YouTube thumbnail, Facebook, X, Pinterest or a phone wallpaper. Drag to choose what's kept, or keep the whole photo with blurred edges.
- **Text effects:** curved text (arch or dip), gradient fills, 3D depth and neon glow, with new styles: Sunset, Rainbow, 3D Pop, Arch, Smile, Ocean and Ice neon.
- **Sky replacement:** in Background, swap the sky for Blue sky, Sunset, Golden hour, Cotton candy, Storm, Starry night, Aurora or a photo of your own. An AI model (SegFormer, about 15 MB, downloaded once) finds the sky, the edges are tidied using the photo's own colours, and the rest of the photo can take on the new sky's light.
- **Effects:** Glitch, Double exposure (with built-in forest, clouds or city lights, or your own photo; optionally only inside the person), Motion blur (optionally keeping the person sharp), Focus blur (tap to choose what stays sharp, circle or tilt-shift band), Light leak, Film dust, and a Pixelate/Blur brush for hiding faces or number plates. Apply one to lock it in, then add another on top.
- **Templates:** 17 single-photo designs (Birthday card, Quote post, YouTube thumbnail, Weekend story, Polaroid note, Event poster, Save the date, Postcard, Magazine cover, and the eight in the Dark pack). Your photo drops in, and the words and stickers arrive as normal layers you can change. Zoom and move the photo inside the design, or swap it.
- **Animation:** give any sticker or text an animation in Layers (Pop in, Slide in, Fade in, Type on, Bounce, Float, Pulse, Wiggle, Swing, Spin) and press Play. Export as a looping **GIF** (up to 600 px) or **Video** (MP4, up to 1080 px) of 2, 3 or 5 seconds. Animate everything gives every layer a movement in one tap.
- **Autosave:** your work is saved in the background a few seconds after each change and when Tinto closes. If it closes without saving (or crashes), the next start offers to carry on where you left off.
- **Recent files:** File › Open Recent, or the arrow next to Open, lists the photos and projects you used last. On Android it lists the projects saved in Documents › Tinto.
- **Layer blend modes:** Multiply, Screen, Overlay, Soft light, Colour dodge and 11 more, in Layers.
- **Zoom and pan:** scroll or pinch to zoom up to 800%, drag an empty spot (or hold Space, or the middle mouse button) to move around, Ctrl + / − / 0. The view redraws sharper as you zoom.
- **Background:** Tinto finds the person in your photo with the same AI as the sticker cutout, then blurs everything behind them (portrait mode), swaps it for a colour or gradient, or removes it (exported as a see-through PNG). Edge softness is adjustable. Works best on people; the AI model downloads once, the first time you use it.
- **Sticker search:** search all emoji and stickers by name, with a Recent row and Favourites (right-click to star).
- **Emoji:** 186 Microsoft Fluent Emoji in seven tabs (Faces, Silly, Love, Animals, Food, Party, Sky & nature), added as stickers with a white die-cut border. They're vector art, so they stay sharp at any size.
- **Sticker packs:** 96 illustrated stickers in 14 packs: Dark, Faces, Silly, Animals, Snacks, Food, Cosy, Love, Party, Summer, Retro, Space, Dreamy and Nature. They're vector art with cute faces, white die-cut borders and a soft shadow, so they stay sharp at any size.
- **Stickers:** 25 vector shapes with colour, outline and drop shadow, plus 28 emoji.
- **Cheeky stickers (18+):** 20 rude word stickers (speech bubbles, bursts, stamps, pills and neon) and 15 naughty emoji. Hidden until you choose **Show** in Stickers.
- **Custom stickers:** import any image and turn it into a sticker. Remove the background with AI (runs on your computer; the model downloads once, about 25 MB), in one click for plain backgrounds, or by tapping a colour; touch up with erase and restore brushes; add a white or black sticker border. Saved stickers stay in **My stickers** for next time.
- **Draw:** freehand brush with a highlighter mode.
- **Layers:** move, resize and rotate on the photo; reorder, hide, duplicate and set opacity.
- **Right-click menu:** right-click a sticker or text for Duplicate, Copy/Paste, Bring to front, Send to back, Flip, Straighten, Centre, Hide and Delete. Right-click the photo to add text right there, paste, undo, copy the finished picture to paste into other apps, or export. Ctrl+C and Ctrl+V copy and paste stickers and text too, and text boxes get the usual Cut/Copy/Paste menu.
- **Collage:** 21 styled templates (Fresh & healed, Polaroids, Film strip, Magazine, Story, Scrapbook, Circles, Heart, Diagonal, Mood board, Postcard, Photo booth, Honeycomb, Gallery wall, Before & after, Pills, Card stack, Newspaper, Arches, Sticker sheet, Banner) with editable titles, plus 12 grid layouts for 2 to 9 photos with spacing, rounded corners and background colour. Template titles become editable text layers when you send a collage to the editor.
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
| Ctrl+Shift+S | Save project as |
| Ctrl+ / Ctrl− / Ctrl+0 | Zoom in / out / fit |
| Hold Space and drag | Move around a zoomed photo |

## Project structure

```
tinto/
├── build/                 Icons used by the installer (icon.ico, icon.png)
├── src/
│   ├── main.js            Main process: window, menu, native open/save, Explorer files
│   ├── preload.js         The small, fixed bridge the editor page can call (window.tinto)
│   ├── splash.html        Startup screen with the logo animation
│   ├── cutout.js          AI tools: person finder (MODNet) and sky finder (SegFormer), run locally
│   ├── assets/icon.png    Window icon
│   └── renderer/
│       ├── index.html     Editor layout
│       ├── styles.css     Editor styles
│       ├── stickerpack.js Illustrated sticker pack (generated by scripts/make-stickers.py)
│       ├── emoji/         Fluent Emoji pack and its MIT licence
│       ├── fonts/         The text fonts (WOFF) and their licences
│       ├── ai-web.js      The same AI tools running in the page, for Android
│       ├── inpaint-worker.js  The object eraser's fill (PatchMatch), run in a worker
│       ├── gif.js         Animated GIF writer
│       └── app.js         Editor: image processing, layers, collage, export
├── scripts/             Sticker pack generator and the AI checks (desktop and in-page)
├── docs/                  The website (GitHub Pages) and the animated logo
├── .github/workflows/     GitHub Actions build
└── package.json           Scripts and electron-builder settings
```

The editor page runs with context isolation, the sandbox on and Node integration off. It can only reach the main process through the calls in `preload.js`.

## Notes

- All 15 fonts come with Tinto (from Google Fonts, cut down to Latin characters), so text looks the same offline. Their licences are in `src/renderer/fonts/LICENSES.txt`.
- The installer isn't code-signed, so Windows SmartScreen may warn on first install. Choose **More info**, then **Run anyway**.
- `src/renderer/index.html` also opens in a normal browser for quick UI work. There, Export shows the image to save manually instead of a save dialog.

## Roadmap

- Batch edit a folder of photos
- Your own presets
- Selective adjustments (brighten or recolour just the sky, or just the person)

## Licence

[MIT](LICENSE)

## Credits

Emoji are [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), used under the MIT licence (see `src/renderer/emoji/LICENSE-fluentui-emoji.txt`).
