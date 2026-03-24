import { create } from "zustand";
import type { DrawElement, Tool, FillStyle, StrokeStyle, AppState, AppActions } from "../types";
import { generateId, generateSeed } from "../utils/ids";
import { measureText } from "../utils/geometry";
import {
  DEFAULT_STROKE_COLOR,
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_ROUGHNESS,
  DEFAULT_OPACITY,
  DEFAULT_FONT_SIZE,
  HISTORY_LIMIT,
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
  showGrid: true,
  theme: "dark" as "dark" | "light",

  setTool: (tool) => set({ activeTool: tool, selectedIds: [] }),

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
    set((state) => ({
      elements: state.elements.filter((el) => !ids.includes(el.id)),
      selectedIds: [],
    })),

  selectElement: (id, multi) =>
    set((state) => ({
      selectedIds: multi
        ? state.selectedIds.includes(id)
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id]
        : [id],
    })),

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
      const newElements = state.clipboard.map((el) => ({
        ...el,
        id: generateId(),
        x: el.x + offset,
        y: el.y + offset,
        seed: generateSeed(),
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
    const newElements = selected.map((el) => ({
      ...el,
      id: generateId(),
      x: el.x + offset,
      y: el.y + offset,
      seed: generateSeed(),
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

  setElements: (elements) => set({ elements }),
  clearAll: () => set({ elements: [], selectedIds: [] }),
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
      }
    }
  },

  setShowTextInput: (pos) => set({ showTextInput: pos }),
  setShowMermaidInput: (pos) => set({ showMermaidInput: pos }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setIsPanning: (panning) => set({ isPanning: panning }),
  setPanStart: (start) => set({ panStart: start }),
  setDrawStart: (start) => set({ drawStart: start }),
  setShowGrid: (show) => set({ showGrid: show }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
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
}));

export default useAppStore;
