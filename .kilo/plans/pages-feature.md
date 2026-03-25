# Pages Feature Implementation Plan

## Overview
Add a multi-page system to rdraw, inspired by tldraw's pages. Each page is an independent canvas with its own elements, selection state, view transform, and undo/redo history. Pages are displayed as tabs in a bottom bar.

## Design Decisions
- **Page tabs position**: Bottom bar below the canvas
- **Undo/redo**: Per-page (each page has independent history)
- **File format**: New v2 format with backward compat for v1
- **Operations**: Create, delete, rename (double-click), duplicate, reorder (drag)

## Data Model

### New types in `src/types/index.ts`
```typescript
export interface Page {
  id: string;
  name: string;
  elements: DrawElement[];
}
```

### AppState changes
Replace flat `elements` with pages-based state:
- Add: `pages: Page[]`, `activePageId: string`
- Keep `elements`, `selectedIds`, `viewTransform`, `history`, `historyIndex` as top-level (they reflect the **active page**)
- Add `pageStateCache: Record<string, { elements, selectedIds, viewTransform, history, historyIndex }>` for saving/restoring per-page state on switch

### AppActions additions
- `createPage(name?: string)` — new page, switch to it
- `deletePage(id: string)` — delete page (cannot delete last)
- `renamePage(id: string, name: string)` — rename
- `duplicatePage(id: string)` — copy all elements to new page
- `reorderPage(fromIndex: number, toIndex: number)` — drag reorder
- `switchPage(id: string)` — save current page state, restore target page state

## Files to Modify (11 files)

### 1. `src/types/index.ts`
- Add `Page` interface
- Add `pages`, `activePageId` to `AppState`
- Add new page actions to `AppActions`

### 2. `src/utils/constants.ts`
- Add `DEFAULT_PAGE_NAME = "Page 1"`
- Add `MAX_PAGES = 40`

### 3. `src/utils/ids.ts`
- Add `generatePageId()` function (returns `"page-" + generateId()`)

### 4. `src/store/useAppStore.ts` — **heaviest change**
- Initialize with `pages: [{ id: "page-default", name: "Page 1", elements: [] }]`, `activePageId: "page-default"`
- `elements` starts as `[]` (active page's elements)
- `pageStateCache: {}` — maps pageId → { elements, selectedIds, viewTransform, history, historyIndex }
- Modify `setElements` to also update the active page's elements in `pages`
- Implement `switchPage(id)`:
  1. Save current page state to cache
  2. Load target page state from cache (or defaults if first visit)
  3. Set `activePageId`, `elements`, `selectedIds`, `viewTransform`, `history`, `historyIndex`
- Implement `createPage(name?)`:
  1. Generate unique name ("Page N")
  2. Add to `pages` array
  3. Call `switchPage` to the new page
- Implement `deletePage(id)`:
  1. Cannot delete last page
  2. If deleting current page, switch to adjacent page first
  3. Remove from `pages` array and `pageStateCache`
- Implement `renamePage(id, name)`
- Implement `duplicatePage(id)`:
  1. Deep-clone elements from source page
  2. Generate new ids/seeds for cloned elements
  3. Create new page with cloned elements
- Implement `reorderPage(fromIndex, toIndex)`:
  1. Move page in `pages` array
- Keep existing `addElement`, `updateElement`, etc. working on `elements` (active page)
- When `addElement`/`updateElement`/etc. modifies `elements`, also sync to the active page in `pages` array (or do this lazily in `switchPage`)

**Key store pattern**: The top-level `elements`, `selectedIds`, `viewTransform`, `history`, `historyIndex` always reflect the active page. On page switch, these are saved to cache and restored from the new page's cache. This means existing code that reads `state.elements` works unchanged.

### 5. `src/components/PageTabs.tsx` — **new component**
- Bottom bar with horizontal page tabs
- Each tab shows page name, active tab is highlighted
- "+" button to create new page
- Double-click tab name to rename (inline edit)
- Right-click context menu: Rename, Duplicate, Delete
- Drag to reorder tabs (HTML5 drag API)
- Tab shows element count as badge

### 6. `src/App.tsx`
- Import and render `<PageTabs />` below the canvas area
- Add CSS class for the bottom page tabs bar

### 7. `src/App.css`
- Add styles for `.page-tabs`, `.page-tab`, `.page-tab.active`, `.page-tab-name`, `.page-tab-add`, `.page-tab-rename-input`, `.page-tab-context-menu`, drag indicator styles

### 8. `src/components/MenuBar.tsx`
- Update `handleNew` to reset pages (single empty page)
- Update `handleOpen` / `handleSave` / `handleSaveAs` to use new format
- Pass `pages` and `activePageId` to save/load functions

### 9. `src/utils/export.ts`
- Update `DrawingData` interface:
  ```typescript
  export interface DrawingDataV1 { version: 1; elements: DrawElement[]; }
  export interface DrawingDataV2 { version: 2; pages: Page[]; activePageId: string; }
  export type DrawingData = DrawingDataV1 | DrawingDataV2;
  ```
- Update `saveDrawing` to accept pages and serialize as v2
- Update `loadDrawing` to detect v1 vs v2 and auto-migrate v1 → v2

### 10. `src/hooks/useKeyboardShortcuts.ts`
- Add `Ctrl+Shift+N` → `createPage()`
- Add `Ctrl+Shift+P` → cycle through pages (or open page picker)

### 11. `src/components/Canvas.tsx`
- No changes needed to rendering (reads `elements` from store which is always active page)
- The `handleCanvasDoubleClick` for mermaid edit reads `state.elements` — works as-is

## Implementation Order
1. Types (`types/index.ts`) — add Page interface, update AppState/AppActions
2. Constants (`constants.ts`) — add page defaults
3. IDs (`ids.ts`) — add generatePageId
4. Store (`useAppStore.ts`) — implement pages state, switchPage, CRUD actions
5. Export (`export.ts`) — update save/load for v2 format with v1 migration
6. MenuBar (`MenuBar.tsx`) — update file operations for pages
7. PageTabs (`PageTabs.tsx`) — new component with full UI
8. App.tsx — add PageTabs to layout
9. App.css — page tabs styles
10. Keyboard shortcuts (`useKeyboardShortcuts.ts`) — page shortcuts

## State Sync Strategy
The store maintains a `pageStateCache` map. On `switchPage`:
1. Save current state: `pageStateCache[activePageId] = { elements, selectedIds, viewTransform, history, historyIndex }`
2. Load target state from cache or defaults
3. Set top-level state properties

For mutations (addElement, updateElement, etc.), they modify the top-level `elements` directly. The cache is only updated on page switch. This means the `pages` array's `elements` field is only used for initial load/save — the live state is always at the top level.

After switching, also update the `pages` array to reflect the previous page's elements (from the saved cache) so that save operations have the correct data.

## Verification
- `npm run build` (tsc + vite build) — must pass with 0 errors
- Manual test:
  1. Open app → single "Page 1" tab at bottom
  2. Draw some shapes on Page 1
  3. Click "+" → "Page 2" created, empty canvas
  4. Draw on Page 2
  5. Click "Page 1" tab → shapes are there
  6. Undo on Page 1 → undoes Page 1's last action (not Page 2's)
  7. Double-click tab → rename
  8. Right-click → Duplicate, Delete
  9. Drag tab → reorder
  10. Save → close → reopen → pages preserved
  11. Open old v1 file → auto-migrated to single page
