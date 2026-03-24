# Infinite Canvas Enhancement Plan

## Current State
The canvas already has unbounded panning, infinite grid, and zoom-to-cursor. Four areas need work.

## Changes

### 1. Zoom-aware selection handles (`src/utils/rendering.ts`, `src/utils/geometry.ts`)
- `drawSelectionHandles`: pass `zoom` param, compute `handleSize = 8 / zoom` so handles stay 8px on screen
- Apply same to `lineWidth` and `lineDash` in the selection rectangle
- `getResizeHandle`: accept `zoom` param, use `threshold = 8 / zoom` for hit detection
- Update call site in `useCanvasEvents.ts` to pass `state.viewTransform.zoom`

### 2. Viewport culling (`src/utils/rendering.ts`)
- Add `getViewportBounds(viewTransform, canvasWidth, canvasHeight)` returning `{x, y, width, height}` in canvas space
- Before the element render loop, filter elements whose bounds don't intersect the viewport (with generous padding ~50px to account for roughjs overshoot)
- Keep the full `elements` array for hit-testing (selection, etc.) — culling is render-only

### 3. Minimap (`src/components/Minimap.tsx`)
- New component: small canvas in bottom-left corner (~160x120)
- Renders a scaled-down view: all elements as colored rectangles, viewport as a white dashed rectangle
- Click on minimap to pan the main view to that position
- Updates via the same `requestAnimationFrame` loop (or a separate one triggered from Canvas)
- Export a `renderMinimap` function; Canvas.tsx calls it inside its render loop

### 4. Coordinate precision safeguard (`src/hooks/useCanvasEvents.ts`)
- Add `CLAMP_COORDINATE = 1e7` constant
- After any `setViewTransform` call, clamp `x` and `y` to `[-CLAMP_COORDINATE, CLAMP_COORDINATE]`
- Also clamp zoom to existing `[0.1, 10]` range (already done in wheel handler, add to zoom buttons too)

### 5. Keyboard shortcut: Ctrl+0 to reset view (`src/hooks/useKeyboardShortcuts.ts`)
- Add handler for `ctrl && e.key === "0"` → call `resetView()`

### 6. Coordinate readout in status bar (`src/components/Canvas.tsx`, `src/App.css`)
- Add a small overlay in bottom-right showing current cursor position in canvas coords and zoom level
- Tracks `onMouseMove` to update position; uses `viewTransform` for zoom display
- Simple `<div>` overlay, no new component needed

## Files Modified
| File | Change |
|------|--------|
| `src/utils/rendering.ts` | Zoom-aware handles, viewport culling, export `getViewportBounds` |
| `src/utils/geometry.ts` | Zoom param in `getResizeHandle` |
| `src/hooks/useCanvasEvents.ts` | Pass zoom to `getResizeHandle`, coordinate clamping |
| `src/hooks/useKeyboardShortcuts.ts` | Ctrl+0 reset view |
| `src/components/Canvas.tsx` | Minimap render call, coordinate readout overlay |
| `src/components/Minimap.tsx` | **New file** — minimap component |
| `src/App.css` | Minimap and coordinate readout styles |

## Verification
1. `npx tsc --noEmit` — no type errors
2. `npx vite build` — builds successfully
3. `cargo build` in `src-tauri` — Rust still compiles
