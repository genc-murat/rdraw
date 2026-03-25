# Highlight Tool Implementation Plan

## Overview
Add a highlighter tool to RDraw that draws semi-transparent neon strokes over canvas content, mimicking a real highlighter marker.

## Design Decisions
- **Keyboard shortcut**: `G`
- **Color palette**: Fixed neon highlighter colors (yellow `#ffeb3b`, green `#69f0ae`, pink `#ff4081`, orange `#ffab40`, cyan `#40c4ff`, red `#ff5252`)
- **Rendering**: Uses `perfect-freehand` (same as freehand tool) with high opacity transparency, wider default stroke width
- **Default stroke width**: 16 (wide, like a real highlighter)
- **Default opacity**: 0.35 (semi-transparent so content underneath is visible)
- **Element type**: Reuses `FreehandElement` structure since the data shape is identical (points-based freehand path)

## Files to Modify (7 files)

### 1. `src/types/index.ts`
- Add `"highlight"` to the `Tool` union type

### 2. `src/utils/constants.ts`
- Add `HIGHLIGHT_COLORS` array with 6 neon colors
- Add `DEFAULT_HIGHLIGHT_STROKE_WIDTH = 16`
- Add `DEFAULT_HIGHLIGHT_OPACITY = 0.35`
- Add `DEFAULT_HIGHLIGHT_COLOR = "#ffeb3b"` (yellow)

### 3. `src/components/Toolbar.tsx`
- Add highlight entry to `TOOLS` array: `{ id: "highlight", label: "Highlight (G)", icon: "🖍" }`

### 4. `src/hooks/useKeyboardShortcuts.ts`
- Add `G` key binding → `setTool("highlight")`

### 5. `src/hooks/useCanvasEvents.ts`
- In `handleMouseDown`: Add `"highlight"` case alongside `"freehand"` — creates a `FreehandElement` with type `"freehand"` but uses highlight defaults (wider stroke, semi-transparent, highlight color)
- The element is stored as a `FreehandElement` so no new type is needed; the highlight behavior is controlled by the properties applied at creation time

### 6. `src/utils/rendering.ts`
- No changes needed — `renderFreehand` already renders freehand elements correctly. The highlight effect comes from the semi-transparent fill color + wide stroke width applied at element creation.

### 7. `src/components/PropertiesPanel.tsx`
- Add a conditional section: when `activeTool === "highlight"`, show a highlight color swatch row with `HIGHLIGHT_COLORS` instead of (or in addition to) the normal stroke/fill colors
- When a highlight color is selected, update `strokeColor` in the store

### 8. `src/store/useAppStore.ts`
- In `setTool`: when switching to `"highlight"`, auto-set `strokeColor` to `DEFAULT_HIGHLIGHT_COLOR`, `strokeWidth` to `DEFAULT_HIGHLIGHT_STROKE_WIDTH`, `opacity` to `DEFAULT_HIGHLIGHT_OPACITY` so the tool is immediately usable with correct defaults

## Implementation Order
1. Types (`types/index.ts`)
2. Constants (`constants.ts`)
3. Toolbar (`Toolbar.tsx`)
4. Keyboard shortcuts (`useKeyboardShortcuts.ts`)
5. Store defaults on tool switch (`useAppStore.ts`)
6. Canvas events (`useCanvasEvents.ts`)
7. Properties panel (`PropertiesPanel.tsx`)

## Verification
- Run `npm run build` (or equivalent) to check for TypeScript errors
- Manual test: select highlight tool with G, draw strokes, verify semi-transparent neon appearance
