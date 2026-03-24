# Mermaid Flowchart Diagram Feature Plan

## Overview

Add Mermaid flowchart diagram support to RDraw. Users can type Mermaid syntax in a textarea overlay (like the text tool), and the diagram renders on the canvas in a **hand-drawn style** using roughjs. Double-click to edit existing Mermaid elements.

## Design Decisions (from user)

- **Interaction**: Text tool-like (click canvas → textarea → Enter to create)
- **Render style**: Hand-drawn (roughjs) - redraw Mermaid nodes/edges with roughjs
- **Diagram types**: Flowchart only
- **Editing**: Double-click to edit Mermaid code

## Architecture

### Rendering Pipeline

1. User types Mermaid flowchart syntax in textarea overlay
2. On submit, call `mermaid.parse()` to validate syntax
3. Call `mermaid.render()` to get SVG + layout data
4. Parse SVG output to extract: node positions/sizes, edge paths, text labels
5. Store as `MermaidElement` with `code: string` + `renderData` cache
6. On canvas render, redraw nodes as roughjs shapes (rectangles/rounded rects) and edges as roughjs lines
7. Text labels rendered with `ctx.fillText()` in monospace font

### SVG Parsing Strategy

Mermaid renders flowchart nodes as `<g>` elements with `class="node"` containing:
- A shape (`<rect>`, `<polygon>`, `<circle>`)
- A `<text>` label

Edges are `<g class="edgePath">` containing `<path>` elements.

We parse these to extract:
- **Nodes**: x, y, width, height, label text, shape type
- **Edges**: SVG path `d` attribute → convert to point array
- **Labels**: edge text labels

## Files to Modify

### 1. `src/types/index.ts`
- Add `"mermaid"` to `Tool` union type
- Add `MermaidElement` interface with `code`, `renderedNodes`, `renderedEdges`, `renderedLabels`
- Update `DrawElement` union type

### 2. `src/utils/mermaid.ts` (NEW)
- `initMermaid()`: Initialize mermaid library with dark theme config
- `parseMermaidCode(code: string)`: Validate syntax via `mermaid.parse()`
- `renderMermaidDiagram(code: string)`: Render to SVG, parse output to extract node/edge data

### 3. `src/utils/rendering.ts`
- Add `renderMermaid(ctx, rc, el)` function
- Add `"mermaid"` case to the render dispatch (line 67-75)

### 4. `src/utils/geometry.ts`
- `getElementBounds()`: Add mermaid case → use stored bounds
- `pointInElement()`: Add mermaid case → bounding box check

### 5. `src/hooks/useCanvasEvents.ts`
- In `handleMouseDown`: Add `"mermaid"` tool handling (show textarea overlay)

### 6. `src/components/Canvas.tsx`
- Add `handleMermaidInputSubmit(code)` async handler
- Add double-click handler for editing existing Mermaid elements
- Larger monospace textarea for Mermaid input

### 7. `src/components/Toolbar.tsx`
- Add mermaid tool entry

### 8. `src/hooks/useKeyboardShortcuts.ts`
- Add `"m"` / `"M"` key binding

### 9. `src/utils/export.ts`
- Add `"mermaid"` case to `generateSVG()`

### 10. `src/App.css`
- Add `.mermaid-input-overlay` styles

### 11. `package.json`
- Add `mermaid` dependency

## Implementation Steps

1. Install mermaid: `npm install mermaid`
2. Add `MermaidElement` to types/index.ts
3. Create src/utils/mermaid.ts
4. Add renderMermaid() to rendering.ts
5. Add mermaid handling to geometry.ts
6. Add mermaid tool to useCanvasEvents.ts
7. Add handleMermaidInputSubmit + double-click editing to Canvas.tsx
8. Add mermaid tool button to Toolbar.tsx
9. Add "M" key binding to useKeyboardShortcuts.ts
10. Add mermaid SVG export to export.ts
11. Add CSS for mermaid input overlay
12. Test end-to-end

## Key Technical Details

### SVG Parsing Strategy
1. Create temporary DOM container, inject Mermaid SVG
2. Query `.node` groups → get `transform="translate(x, y)"` and inner shape dimensions
3. Query `.edgePath` groups → get `<path d="...">` and convert to point array
4. Query `.edgeLabel` for edge text
5. Calculate overall bounding box, normalize coords to top-left

### Roughjs Shape Mapping
- Rectangular nodes → `rc.rectangle()` with rounded corners
- Diamond nodes (decision) → `rc.polygon()` with 4 points
- Edges → `rc.line()` for straight segments

### Async Handling
- Mermaid.render() is async → store render data in element at creation time
- No async needed during canvas render (data cached in element)
- Re-render only when code changes (double-click edit)
