<div align="center">

# 🗂️ S3 Explorer

A fast, cross-platform desktop S3 client built with Electron, SolidJS, and the
AWS SDK v3. Connects to AWS S3 and any S3-compatible service (MinIO, Cloudflare
R2, Backblaze B2, and more).

[![Build](https://github.com/astrixgame/s3explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/astrixgame/s3explorer/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron)](https://www.electronjs.org/)
[![SolidJS](https://img.shields.io/badge/SolidJS-1.8-4F86C6?logo=solid)](https://solidjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## Overview

S3 Explorer is a native desktop application for browsing, uploading, downloading,
and editing files stored in S3-compatible object storage. All credentials are
saved locally — no cloud account required.

### Key Features

- 🔌 **Multiple Connections** — save and switch between any number of S3
  endpoints; supports custom endpoints for S3-compatible APIs
- 🗄️ **Bucket & File Browser** — navigate buckets, folders, and files with a
  two-pane layout (tree + table)
- 📤 **Upload & Download** — multi-file upload via native dialog, download with
  save-as dialog
- ✏️ **Monaco Editor** — full VS Code editor embedded in the preview panel;
  read-only syntax highlighting and live editing for text files, scripts, and
  configs with `Ctrl+S` save-to-S3
- 🔍 **File Preview** — inline image viewer (up to 10 MB), Monaco-powered text
  preview for 35+ languages, MIME type detection
- 🏷️ **Rename & Move** — edit the full S3 key path to rename or move files and
  folders
- ☑️ **Multi-select** — checkbox selection with `Ctrl+A`, shift-range, batch
  download and delete
- ⌨️ **Keyboard Shortcuts** — `Ctrl+A`, `Ctrl+D`, `Ctrl+U`, `Ctrl+R`, `Del`,
  `Esc`, `Ctrl+S`
- 🎨 **Material Design 3** — full MD3 dark theme with tonal surfaces, pill
  navigation, and state-layer interactions
- 💜 **MD3 Monaco Theme** — custom editor theme derived entirely from the MD3
  colour palette

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Electron Main                      │
│                                                      │
│  ┌─────────────────┐     ┌────────────────────────┐  │
│  │   IPC Handlers  │     │    JSON Credential     │  │
│  │  s3:*           │     │    Store               │  │
│  │  store:*        │     │  userData/s3explorer   │  │
│  └────────┬────────┘     └────────────────────────┘  │
│           │ AWS SDK v3                                │
│  ┌────────▼────────┐                                  │
│  │   S3 Client     │─────────────────────► S3 / R2   │
│  │  (s3.ts)        │                       MinIO …   │
│  └─────────────────┘                                  │
└──────────────────────┬──────────────────────────────┘
                       │ contextBridge (IPC)
┌──────────────────────▼──────────────────────────────┐
│                 Renderer (SolidJS + Vite)            │
│                                                      │
│  Sidebar          FileExplorer       PreviewPanel    │
│  ├ Connections    ├ Toolbar          ├ Monaco Editor │
│  ├ Buckets        ├ Breadcrumbs      ├ Image Viewer  │
│  └ Folder Tree    └ File Table       └ Edit & Save   │
│                                                      │
│             appStore (createStore)                   │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |

### Install & Run

```bash
git clone https://github.com/astrixgame/s3explorer.git
cd s3explorer
npm install
npm run dev
```

`npm run dev` starts the Vite dev server on `:5173` and launches Electron with
hot-reload for the renderer. The Electron main process files must be recompiled
manually after changes to `electron/`:

```bash
npx tsc -p tsconfig.node.json
```

### Build for Distribution

```bash
npm run dist
```

Packages are output to `release/`:

| Platform | Output |
|----------|--------|
| Linux | `release/*.AppImage` |
| macOS | `release/*.dmg` |
| Windows | `release/*.exe` (NSIS installer) |

---

## Adding a Connection

1. Click **Add Connection** in the sidebar
2. Fill in:
   - **Name** — display label (e.g. `My AWS Prod`)
   - **Access Key ID** and **Secret Access Key**
   - **Region** — choose from list or select *Custom…*
   - **Endpoint** *(optional)* — for S3-compatible services

### S3-Compatible Services

| Service | Endpoint example |
|---------|-----------------|
| MinIO | `http://localhost:9000` |
| Cloudflare R2 | `https://<account>.r2.cloudflarestorage.com` |
| Backblaze B2 | `https://s3.<region>.backblazeb2.com` |
| Wasabi | `https://s3.<region>.wasabisys.com` |
| Any S3-compatible | your endpoint URL |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+A` | Select all files |
| `Ctrl+U` | Upload files |
| `Ctrl+D` | Download selected |
| `Del` | Delete selected |
| `Ctrl+R` | Refresh |
| `Ctrl+S` | Save file (in editor) |
| `Ctrl+Z` | Undo (in editor) |
| `Esc` | Cancel / collapse / deselect |

---

## File Preview & Editor

Click any file row to open the preview panel. For text files a read-only Monaco
Editor view with full syntax highlighting is shown. Press **Edit** to switch to
live-edit mode — changes are saved back to S3 on `Ctrl+S` or the **Save**
button.

Press the **⤢ expand** button to open the editor as a full-screen modal.

**Supported languages** (syntax highlighting + language server features):

`TypeScript` · `JavaScript` · `JSON` · `Python` · `Go` · `Rust` · `C/C++` ·
`Java` · `Kotlin` · `Ruby` · `PHP` · `SQL` · `Shell` · `YAML` · `TOML` ·
`XML` · `HTML` · `CSS/SCSS` · `Markdown` · `Dockerfile` · `Makefile` · and more

---

## Project Structure

```
s3explorer/
├── electron/
│   ├── main.ts          IPC handlers, credential store, window creation
│   ├── preload.ts       contextBridge — exposes IPC to renderer
│   └── s3.ts            AWS SDK v3 wrappers (list, upload, download, rename, preview)
├── shared/
│   └── types.ts         Types shared between main and renderer
├── src/
│   ├── App.tsx
│   ├── app.css          MD3 dark theme (full custom design system)
│   ├── electron.d.ts    Window.electron type declarations
│   ├── store/
│   │   └── appStore.ts  SolidJS reactive store + all async actions
│   └── components/
│       ├── AddConnectionModal.tsx
│       ├── BucketList.tsx
│       ├── EmptyState.tsx
│       ├── FileExplorer.tsx   Main table, toolbar, multi-select, shortcuts
│       ├── MonacoEditor.tsx   Monaco wrapper + MD3 theme definition
│       ├── Notification.tsx
│       └── Sidebar.tsx        Navigation drawer, bucket list, folder tree
├── dist-electron/       Compiled Electron main process (committed)
├── package.json
├── tsconfig.json        Renderer (SolidJS)
├── tsconfig.node.json   Electron main process
└── vite.config.ts
```

---

## Development

```bash
npm run dev        # start Vite + Electron in dev mode (hot-reload renderer)
npm run build      # compile Electron TS + build renderer
npm run dist       # full distribution package
npm run preview    # preview the built renderer in a browser
```

After editing any file under `electron/`, recompile before restarting:

```bash
npx tsc -p tsconfig.node.json
```

---

## Credential Storage

Credentials are stored in a plain JSON file at:

| Platform | Path |
|----------|------|
| Linux | `~/.config/s3explorer/s3explorer.json` |
| macOS | `~/Library/Application Support/s3explorer/s3explorer.json` |
| Windows | `%APPDATA%\s3explorer\s3explorer.json` |

Credentials never leave your machine — all S3 calls are made from the Electron
main process directly.

---

## License

Distributed under the [MIT License](LICENSE).
