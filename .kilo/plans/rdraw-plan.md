# RDraw - Excalidraw Clone with Tauri + React + Rust

## Project Overview
Full Excalidraw clone as a native desktop app using Tauri 2.x, React 18+, TypeScript, and Rust.

## Tech Stack
- **Tauri 2.x** — Native desktop shell
- **React 18** + **TypeScript** — UI framework
- **Vite** — Build tool
- **roughjs** — Hand-drawn/sketchy shape rendering
- **perfect-freehand** — Smooth freehand stroke rendering
- **zustand** — State management
- **Rust** — File I/O, image/SVG export via Tauri commands

## Directory Structure
```
rdraw/
├── package.json, index.html, vite.config.ts, tsconfig.json
├── src/                              # React frontend
│   ├── main.tsx, App.tsx, App.css
│   ├── types/index.ts                # All type definitions
│   ├── store/useAppStore.ts          # Zustand store
│   ├── utils/
│   │   ├── rendering.ts              # Canvas rendering (roughjs)
│   │   ├── geometry.ts               # Hit testing, bounding boxes
│   │   ├── export.ts                 # PNG/SVG/JSON export
│   │   ├── history.ts                # Undo/Redo
│   │   ├── ids.ts                    # UUID generation
│   │   └── constants.ts              # Defaults
│   ├── components/
│   │   ├── Canvas.tsx                # Main canvas + events
│   │   ├── Toolbar.tsx               # Tool selection
│   │   ├── PropertiesPanel.tsx       # Element styling panel
│   │   ├── ColorPicker.tsx           # Color picker
│   │   ├── MenuBar.tsx               # Top menu
│   │   └── ZoomControls.tsx          # Zoom controls
│   └── hooks/
│       ├── useCanvasEvents.ts        # Mouse/keyboard handlers
│       └── useKeyboardShortcuts.ts   # Global shortcuts
├── src-tauri/                        # Rust backend
│   ├── Cargo.toml, build.rs, tauri.conf.json
│   ├── src/main.rs, src/lib.rs
│   ├── capabilities/default.json
│   └── icons/
```

## Implementation Steps (14 Steps)

### Step 1: Project Scaffolding
- Initialize Tauri 2.x project with `npm create tauri-app@latest` (React + TypeScript)
- Install dependencies: `roughjs`, `perfect-freehand`, `zustand`
- Verify `npm run tauri dev` works

### Step 2: Core Types & Zustand Store
- `types/index.ts` — DrawElement, Tool, AppState, ViewTransform types
- `store/useAppStore.ts` — elements array, selected IDs, active tool, styling defaults, undo/redo history (snapshot-based, 50 limit)

### Step 3: Canvas Component (Rendering Foundation)
- Full-viewport `<canvas>` with devicePixelRatio support
- View transform: pan (space+drag / middle mouse), zoom (wheel)
- `rendering.ts` — clear, apply transforms, iterate elements, draw with roughjs

### Step 4: Drawing Tools — Shapes
- Rectangle, Ellipse, Diamond: mousedown→drag→mouseup
- Line, Arrow: two-point with arrowhead rendering
- Live preview during drawing (temporary element)

### Step 5: roughjs Integration
- Replace plain canvas with `roughjs.generator` + `draw`
- Per-element: roughness, fillStyle (hachure/cross-hatch/solid/none), strokeStyle

### Step 6: Freehand Drawing
- `perfect-freehand` for smooth pressure-aware strokes
- Collect points on mousemove, render as filled SVG-like path
- Store `[number, number][]` points in element

### Step 7: Text Tool
- Click to place, show overlay input
- Render on canvas with configurable fontSize
- Multiline support

### Step 8: Selection & Manipulation
- Hit testing: point-in-shape, distance-to-line
- 8 resize handles + rotation handle
- Drag to move, handle-drag to resize, rotation handle
- Shift for aspect-ratio lock

### Step 9: Properties Panel
- Right panel: stroke/fill color pickers, fill style, stroke width, roughness, opacity sliders
- Arrowhead selectors for line/arrow

### Step 10: Toolbar & Menu Bar
- Left vertical toolbar with SVG tool icons
- Top menu: File (New/Open/Save/Save As/Export), Edit (Undo/Redo/Cut/Copy/Paste), View (Zoom)

### Step 11: Keyboard Shortcuts
- Ctrl+Z/Shift+Z (undo/redo), Ctrl+C/X/V (clipboard), Delete, Ctrl+A, Ctrl+S/O/N
- Tool keys: V, R, E, D, L, A, P, T

### Step 12: Rust Tauri Commands
- `open_file(path) -> String` — read drawing JSON
- `save_file(path, content)` — write drawing JSON
- `export_image(path, data: Vec<u8>)` — write PNG
- `export_svg(path, content)` — write SVG
- Configure capabilities for dialog + fs plugins

### Step 13: Export & File Operations
- Export PNG: canvas.toBlob → bytes → invoke `export_image`
- Export SVG: generate SVG string → invoke `export_svg`
- Save/Open: JSON serialize → invoke commands
- Dialogs via `@tauri-apps/plugin-dialog`

### Step 14: Polish
- Cursor changes per tool
- Multi-select (Shift+click, drag-selection box)
- Z-order (bring to front / send to back)
- Group/ungroup

## Rust Commands
```rust
#[tauri::command] fn open_file(path: String) -> Result<String, String>
#[tauri::command] fn save_file(path: String, content: String) -> Result<(), String>
#[tauri::command] fn export_image(path: String, data: Vec<u8>) -> Result<(), String>
#[tauri::command] fn export_svg(path: String, content: String) -> Result<(), String>
```

## npm Dependencies
- `roughjs`, `perfect-freehand`, `zustand`
- `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-shell`

## Cargo Dependencies
- `tauri` 2.x, `tauri-build` 2.x, `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-shell`, `serde`, `serde_json`
