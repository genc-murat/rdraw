import { create } from "zustand";
import type { DrawElement, Tool, FillStyle, StrokeStyle, AppState, AppActions } from "../types";
import { generateId, generateSeed, generatePageId, generateGroupId } from "../utils/ids";
import { measureText } from "../utils/geometry";
import {
  DEFAULT_STROKE_COLOR,
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_ROUGHNESS,
  DEFAULT_OPACITY,
  DEFAULT_FONT_SIZE,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_HIGHLIGHT_STROKE_WIDTH,
  DEFAULT_HIGHLIGHT_OPACITY,
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_TEXT_COLOR,
  DEFAULT_NOTE_FONT_SIZE,
  C4_COLORS,
  HISTORY_LIMIT,
  MAX_PAGES,
} from "../utils/constants";

type Store = AppState & AppActions;

const useAppStore = create<Store>((set, get) => ({
  elements: [],
  selectedIds: [],
  activeTool: "select" as Tool,
  viewTransform: { x: 0, y: 0, zoom: 1 },
  isDrawing: false,
  isPanning: false,
  panStart: null,
  drawStart: null,
  strokeColor: DEFAULT_STROKE_COLOR,
  fillColor: DEFAULT_FILL_COLOR,
  fillStyle: "hachure" as FillStyle,
  strokeStyle: "solid" as StrokeStyle,
  strokeWidth: DEFAULT_STROKE_WIDTH,
  roughness: DEFAULT_ROUGHNESS,
  opacity: DEFAULT_OPACITY,
  fontSize: DEFAULT_FONT_SIZE,
  history: [[]],
  historyIndex: 0,
  clipboard: [],
  filePath: null,
  showTextInput: null,
  showMermaidInput: null,
  showC4LabelInput: null,
  showGrid: true,
  toolbarOrientation: "horizontal" as "horizontal" | "vertical",
  toolbarPosition: { x: 80, y: 4 },
  theme: "dark" as "dark" | "light",
  pages: [{ id: "page-default", name: "Page 1", elements: [] }],
  activePageId: "page-default",
  pageStateCache: {},

  setTool: (tool) => {
    const updates: Record<string, any> = { activeTool: tool, selectedIds: [] };
    if (tool === "highlight") {
      updates.strokeColor = DEFAULT_HIGHLIGHT_COLOR;
      updates.strokeWidth = DEFAULT_HIGHLIGHT_STROKE_WIDTH;
      updates.opacity = DEFAULT_HIGHLIGHT_OPACITY;
    } else if (tool === "note") {
      updates.fillColor = DEFAULT_NOTE_COLOR;
      updates.fillStyle = "solid";
      updates.strokeColor = DEFAULT_NOTE_TEXT_COLOR;
      updates.strokeWidth = DEFAULT_STROKE_WIDTH;
      updates.opacity = DEFAULT_OPACITY;
      updates.fontSize = DEFAULT_NOTE_FONT_SIZE;
    } else if (C4_COLORS[tool]) {
      const c4 = C4_COLORS[tool];
      updates.strokeColor = c4.stroke;
      updates.fillColor = c4.fill;
      updates.fillStyle = "solid";
      updates.strokeWidth = DEFAULT_STROKE_WIDTH;
      updates.opacity = DEFAULT_OPACITY;
    } else {
      updates.strokeColor = DEFAULT_STROKE_COLOR;
      updates.strokeWidth = DEFAULT_STROKE_WIDTH;
      updates.opacity = DEFAULT_OPACITY;
    }
    set(updates);
  },

  addElement: (element) =>
    set((state) => ({ elements: [...state.elements, element] })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } as DrawElement : el
      ),
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    })),

  removeElements: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      const elements = state.elements
        .filter((el) => !idSet.has(el.id))
        .map((el) => {
          if (el.type === "arrow" || el.type === "line" || el.type === "c4-relationship") {
            const lineEl = el as any;
            const updates: any = {};
            if (lineEl.startElementId && idSet.has(lineEl.startElementId)) {
              updates.startElementId = undefined;
              updates.startAnchor = undefined;
            }
            if (lineEl.endElementId && idSet.has(lineEl.endElementId)) {
              updates.endElementId = undefined;
              updates.endAnchor = undefined;
            }
            if (Object.keys(updates).length > 0) {
              return { ...el, ...updates };
            }
          }
          return el;
        });
      return { elements, selectedIds: [] };
    }),

  selectElement: (id, multi) =>
    set((state) => {
      if (multi) {
        return {
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        };
      }
      const el = state.elements.find((e) => e.id === id);
      if (el?.groupId) {
        const groupIds = state.elements
          .filter((e) => e.groupId === el.groupId)
          .map((e) => e.id);
        return { selectedIds: groupIds };
      }
      return { selectedIds: [id] };
    }),

  clearSelection: () => set({ selectedIds: [] }),

  selectAll: () =>
    set((state) => ({
      selectedIds: state.elements.map((el) => el.id),
    })),

  setViewTransform: (transform) =>
    set((state) => ({
      viewTransform: { ...state.viewTransform, ...transform },
    })),

  resetView: () => set({ viewTransform: { x: 0, y: 0, zoom: 1 } }),

  pushHistory: () =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.elements)));
      if (newHistory.length > HISTORY_LIMIT) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        elements: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        selectedIds: [],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        elements: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        selectedIds: [],
      };
    }),

  copy: () =>
    set((state) => {
      const selected = state.elements.filter((el) =>
        state.selectedIds.includes(el.id)
      );
      return { clipboard: JSON.parse(JSON.stringify(selected)) };
    }),

  cut: () =>
    set((state) => {
      const selected = state.elements.filter((el) =>
        state.selectedIds.includes(el.id)
      );
      return {
        clipboard: JSON.parse(JSON.stringify(selected)),
        elements: state.elements.filter(
          (el) => !state.selectedIds.includes(el.id)
        ),
        selectedIds: [],
      };
    }),

  paste: () =>
    set((state) => {
      if (state.clipboard.length === 0) return state;
      const offset = 20;
      // Check if clipboard elements share a group
      const clipGroupIds = new Set(state.clipboard.map((el) => el.groupId).filter(Boolean));
      const newGroupId = clipGroupIds.size === 1 ? generateGroupId() : undefined;
      const newElements = state.clipboard.map((el) => ({
        ...el,
        id: generateId(),
        x: el.x + offset,
        y: el.y + offset,
        seed: generateSeed(),
        groupId: el.groupId ? newGroupId : undefined,
      }));
      return {
        elements: [...state.elements, ...newElements],
        selectedIds: newElements.map((el) => el.id),
        clipboard: JSON.parse(JSON.stringify(newElements)),
      };
    }),

  duplicate: () => {
    const state = get();
    const selected = state.elements.filter((el) =>
      state.selectedIds.includes(el.id)
    );
    const offset = 20;
    // Check if selected elements share a group
    const selGroupIds = new Set(selected.map((el) => el.groupId).filter(Boolean));
    const newGroupId = selGroupIds.size === 1 ? generateGroupId() : undefined;
    const newElements = selected.map((el) => ({
      ...el,
      id: generateId(),
      x: el.x + offset,
      y: el.y + offset,
      seed: generateSeed(),
      groupId: el.groupId ? newGroupId : undefined,
    }));
    set((s) => ({
      elements: [...s.elements, ...newElements],
      selectedIds: newElements.map((el) => el.id),
    }));
  },

  bringToFront: () =>
    set((state) => {
      const selected = state.elements.filter((el) =>
        state.selectedIds.includes(el.id)
      );
      const rest = state.elements.filter(
        (el) => !state.selectedIds.includes(el.id)
      );
      return { elements: [...rest, ...selected] };
    }),

  sendToBack: () =>
    set((state) => {
      const selected = state.elements.filter((el) =>
        state.selectedIds.includes(el.id)
      );
      const rest = state.elements.filter(
        (el) => !state.selectedIds.includes(el.id)
      );
      return { elements: [...selected, ...rest] };
    }),

  setElements: (elements) =>
    set((state) => ({
      elements,
      pages: state.pages.map((p) =>
        p.id === state.activePageId ? { ...p, elements } : p
      ),
    })),
  clearAll: () =>
    set((state) => ({
      elements: [],
      selectedIds: [],
      pages: [{ id: "page-default", name: "Page 1", elements: [] }],
      activePageId: "page-default",
      pageStateCache: {},
      history: [[]],
      historyIndex: 0,
    })),
  setFilePath: (path) => set({ filePath: path }),

  setStrokeColor: (color) => {
    const state = get();
    set({ strokeColor: color });
    for (const id of state.selectedIds) {
      state.updateElement(id, { strokeColor: color });
    }
  },

  setFillColor: (color) => {
    const state = get();
    set({ fillColor: color });
    for (const id of state.selectedIds) {
      state.updateElement(id, { fillColor: color });
    }
  },

  setFillStyle: (style) => {
    const state = get();
    set({ fillStyle: style });
    for (const id of state.selectedIds) {
      state.updateElement(id, { fillStyle: style });
    }
  },

  setStrokeStyle: (style) => {
    const state = get();
    set({ strokeStyle: style });
    for (const id of state.selectedIds) {
      state.updateElement(id, { strokeStyle: style });
    }
  },

  setStrokeWidth: (width) => {
    const state = get();
    set({ strokeWidth: width });
    for (const id of state.selectedIds) {
      state.updateElement(id, { strokeWidth: width });
    }
  },

  setRoughness: (roughness) => {
    const state = get();
    set({ roughness });
    for (const id of state.selectedIds) {
      state.updateElement(id, { roughness });
    }
  },

  setOpacity: (opacity) => {
    const state = get();
    set({ opacity });
    for (const id of state.selectedIds) {
      state.updateElement(id, { opacity });
    }
  },

  setFontSize: (size) => {
    const state = get();
    set({ fontSize: size });
    for (const id of state.selectedIds) {
      const el = state.elements.find((e) => e.id === id);
      if (el && el.type === "text") {
        const textEl = el as any;
        const measured = measureText(textEl.text, size);
        state.updateElement(id, {
          fontSize: size,
          width: measured.width,
          height: measured.height,
        } as any);
      } else if (el && el.type === "note") {
        const noteEl = el as any;
        if (noteEl.text) {
          const measured = measureText(noteEl.text, size);
          state.updateElement(id, {
            fontSize: size,
            width: measured.width + 32,
            height: measured.height + 24,
          } as any);
        } else {
          state.updateElement(id, { fontSize: size } as any);
        }
      }
    }
  },

  setShowTextInput: (pos) => set({ showTextInput: pos }),
  setShowMermaidInput: (pos) => set({ showMermaidInput: pos }),
  setShowC4LabelInput: (pos) => set({ showC4LabelInput: pos }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setIsPanning: (panning) => set({ isPanning: panning }),
  setPanStart: (start) => set({ panStart: start }),
  setDrawStart: (start) => set({ drawStart: start }),
  setShowGrid: (show) => set({ showGrid: show }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleToolbarOrientation: () => set((state) => ({ toolbarOrientation: state.toolbarOrientation === "horizontal" ? "vertical" : "horizontal" })),
  setToolbarPosition: (pos) => set({ toolbarPosition: pos }),
  setTheme: (theme) => {
    document.body.classList.toggle("light-theme", theme === "light");
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      document.body.classList.toggle("light-theme", next === "light");
      return { theme: next };
    }),

  switchPage: (id) =>
    set((state) => {
      if (id === state.activePageId) return state;
      const pages = [...state.pages];
      const prevIdx = pages.findIndex((p) => p.id === state.activePageId);
      if (prevIdx >= 0) {
        pages[prevIdx] = { ...pages[prevIdx], elements: state.elements };
      }
      const cache = { ...state.pageStateCache };
      cache[state.activePageId] = {
        elements: state.elements,
        selectedIds: state.selectedIds,
        viewTransform: state.viewTransform,
        history: state.history,
        historyIndex: state.historyIndex,
      };
      const target = cache[id];
      if (target) {
        return {
          pages,
          activePageId: id,
          pageStateCache: cache,
          elements: target.elements,
          selectedIds: target.selectedIds,
          viewTransform: target.viewTransform,
          history: target.history,
          historyIndex: target.historyIndex,
        };
      }
      const page = pages.find((p) => p.id === id);
      return {
        pages,
        activePageId: id,
        pageStateCache: cache,
        elements: page ? page.elements : [],
        selectedIds: [],
        viewTransform: { x: 0, y: 0, zoom: 1 },
        history: [page ? JSON.parse(JSON.stringify(page.elements)) : []],
        historyIndex: 0,
      };
    }),

  createPage: (name) => {
    const state = get();
    if (state.pages.length >= MAX_PAGES) return;
    let pageName = name;
    if (!pageName) {
      let n = state.pages.length + 1;
      const existing = new Set(state.pages.map((p) => p.name));
      while (existing.has(`Page ${n}`)) n++;
      pageName = `Page ${n}`;
    }
    const newPage = { id: generatePageId(), name: pageName, elements: [] };
    set((s) => ({ pages: [...s.pages, newPage] }));
    get().switchPage(newPage.id);
  },

  deletePage: (id) => {
    const state = get();
    if (state.pages.length <= 1) return;
    if (id === state.activePageId) {
      const idx = state.pages.findIndex((p) => p.id === id);
      const nextIdx = idx < state.pages.length - 1 ? idx + 1 : idx - 1;
      get().switchPage(state.pages[nextIdx].id);
    }
    set((s) => {
      const pages = s.pages.filter((p) => p.id !== id);
      const cache = { ...s.pageStateCache };
      delete cache[id];
      return { pages, pageStateCache: cache };
    });
  },

  renamePage: (id, name) =>
    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? { ...p, name } : p)),
    })),

  duplicatePage: (id) => {
    const state = get();
    const sourcePage = state.pages.find((p) => p.id === id);
    if (!sourcePage || state.pages.length >= MAX_PAGES) return;
    let sourceElements: DrawElement[];
    if (id === state.activePageId) {
      sourceElements = state.elements;
    } else {
      const cached = state.pageStateCache[id];
      sourceElements = cached ? cached.elements : sourcePage.elements;
    }
    const cloned = JSON.parse(JSON.stringify(sourceElements)) as DrawElement[];
    const newElements = cloned.map((el) => ({
      ...el,
      id: generateId(),
      seed: generateSeed(),
    }));
    let n = state.pages.length + 1;
    const existing = new Set(state.pages.map((p) => p.name));
    while (existing.has(`${sourcePage.name} (${n})`)) n++;
    const newPage = {
      id: generatePageId(),
      name: `${sourcePage.name} (${n})`,
      elements: newElements,
    };
    set((s) => ({ pages: [...s.pages, newPage] }));
    get().switchPage(newPage.id);
  },

  reorderPage: (fromIndex, toIndex) =>
    set((state) => {
      const pages = [...state.pages];
      const [moved] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, moved);
      return { pages };
    }),

  group: () => {
    const state = get();
    if (state.selectedIds.length < 2) return;
    const groupId = generateGroupId();
    state.pushHistory();
    set((s) => ({
      elements: s.elements.map((el) =>
        s.selectedIds.includes(el.id) ? { ...el, groupId } : el
      ),
    }));
  },

  ungroup: () => {
    const state = get();
    const groupIds = new Set<string>();
    for (const id of state.selectedIds) {
      const el = state.elements.find((e) => e.id === id);
      if (el?.groupId) groupIds.add(el.groupId);
    }
    if (groupIds.size === 0) return;
    state.pushHistory();
    set((s) => ({
      elements: s.elements.map((el) =>
        el.groupId && groupIds.has(el.groupId) ? { ...el, groupId: undefined } : el
      ),
    }));
  },
}));

export default useAppStore;
