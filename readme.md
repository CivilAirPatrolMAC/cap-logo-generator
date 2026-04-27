# Civil Air Patrol Subordinate Graphic Generator

A browser-based tool for creating Civil Air Patrol subordinate entity graphics that follow CAP brand guidance.

The app lets you:
- Enter subordinate text (up to 50 characters).
- Choose the base CAP logo variant (All Blue or All White).
- Add an approved secondary graphic from searchable dropdowns (Region/Wing/Group/Squadron, NCSA/CSA/NFA, or Directorates/Programs/Campaigns).
- Upload a custom approved secondary graphic and optionally remove near-white backgrounds.
- Preview the result live and download the generated image as a PNG.

## How it works

The generator renders to an HTML `<canvas>` in real time using plain JavaScript:
- `index.html` provides the form controls and preview area.
- `script.js` handles loading assets, dropdown behavior, text fitting, emblem placement, transparency processing, and PNG download.
- `emblemoptions.js` is the source of truth for available emblems/options.

## Project structure

```text
.
├── index.html                # App UI
├── script.js                 # Canvas rendering and interactions
├── styles.css                # Styling/layout
├── emblemoptions.js          # Emblem metadata (labels, availability, paths)
├── BlueLogo.png              # CAP base logo (blue)
├── WhiteLogo.png             # CAP base logo (white)
├── font.woff2                # Rajdhani font used for subordinate text
├── directorate/              # Directorate/program/campaign graphics
├── ncsa/                     # NCSA/CSA/NFA graphics
├── region/                   # Region graphics
├── wing/                     # Wing graphics
├── group/                    # Group graphics
└── squadron/                 # Squadron graphics
```

## Running locally

Because this is a static web app, you can run it with any simple HTTP server.

### Option 1: Python (recommended)

```bash
python3 -m http.server 8080
```

Then open: `http://localhost:8080`

### Option 2: VS Code Live Server

Open the repo in VS Code and start **Live Server** from `index.html`.

> Note: Opening `index.html` directly as a `file://` URL may work for basic UI, but using a local HTTP server is the most reliable approach for module loading and asset paths.

## Using the tool

1. Open the app in your browser.
2. Enter your subordinate line text.
3. Select the base logo version (blue/white).
4. Choose one secondary graphic source:
   - Emblem dropdown
   - NCSA dropdown
   - Directorate/program dropdown
   - Or upload your own approved graphic
5. (Optional) Enable transparency cleanup for uploaded images.
6. Verify spacing/alignment in **Live Preview**.
7. Click **Download** to save `Graphic.png`.

## Adding or updating emblems

To add more selectable graphics:
1. Place the emblem file in the appropriate folder (`wing/`, `squadron/`, `directorate/`, etc.).
2. Add or update an entry in `emblemoptions.js` with:
   - `value`
   - `label`
   - `type`
   - `path`
   - `available`
3. Reload the app.

Entries marked `available: false` appear as unavailable in dropdowns.

## Notes

- The footer in `index.html` displays tool version and maintainer contact.
- This project has no build step, package manager dependency, or backend service.
