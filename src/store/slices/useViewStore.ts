import type { ViewTransform } from "../../types";
import type { StoreCreator } from "./types";

export interface ViewState {
  viewTransform: ViewTransform;
  isDrawing: boolean;
  isPanning: boolean;
  panStart: { x: number; y: number } | null;
  drawStart: { x: number; y: number } | null;
  showTextInput: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null;
  showMermaidInput: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null;
  showC4LabelInput: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null;
  showGrid: boolean;
  toolbarOrientation: "horizontal" | "vertical";
  toolbarPosition: { x: number; y: number };
  panelOpen: boolean;
  panelPosition: { x: number; y: number };
  theme: "dark" | "light" | "paper";
  presentationMode: boolean;
  presentationSlideIndex: number;
}

export interface ViewActions {
  setViewTransform: (transform: Partial<ViewTransform>) => void;
  resetView: () => void;
  setIsDrawing: (drawing: boolean) => void;
  setIsPanning: (panning: boolean) => void;
  setPanStart: (start: { x: number; y: number } | null) => void;
  setDrawStart: (start: { x: number; y: number } | null) => void;
  setShowTextInput: (pos: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null) => void;
  setShowMermaidInput: (pos: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null) => void;
  setShowC4LabelInput: (pos: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null) => void;
  setShowGrid: (show: boolean) => void;
  toggleGrid: () => void;
  toggleToolbarOrientation: () => void;
  setToolbarPosition: (pos: { x: number; y: number }) => void;
  togglePanel: () => void;
  setPanelPosition: (pos: { x: number; y: number }) => void;
  setTheme: (theme: "dark" | "light" | "paper") => void;
  toggleTheme: () => void;
  startPresentation: () => void;
  exitPresentation: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
}

export const initialViewState: ViewState = {
  viewTransform: { x: 0, y: 0, zoom: 1 },
  isDrawing: false,
  isPanning: false,
  panStart: null,
  drawStart: null,
  showTextInput: null,
  showMermaidInput: null,
  showC4LabelInput: null,
  showGrid: true,
  toolbarOrientation: "horizontal",
  toolbarPosition: { x: 80, y: 4 },
  panelOpen: false,
  panelPosition: { x: typeof window !== "undefined" ? window.innerWidth - 252 : 800, y: 12 },
  theme: "dark",
  presentationMode: false,
  presentationSlideIndex: 0,
};

export const createViewSlice: StoreCreator<ViewState & ViewActions> = (set, get) => ({
  ...initialViewState,

  setViewTransform: (transform) =>
    set((state: any) => ({
      viewTransform: { ...state.viewTransform, ...transform },
    })),

  resetView: () => set({ viewTransform: { x: 0, y: 0, zoom: 1 } }),

  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setIsPanning: (panning) => set({ isPanning: panning }),
  setPanStart: (start) => set({ panStart: start }),
  setDrawStart: (start) => set({ drawStart: start }),

  setShowTextInput: (pos) => set({ showTextInput: pos }),
  setShowMermaidInput: (pos) => set({ showMermaidInput: pos }),
  setShowC4LabelInput: (pos) => set({ showC4LabelInput: pos }),

  setShowGrid: (show) => set({ showGrid: show }),
  toggleGrid: () => set((state: any) => ({ showGrid: !state.showGrid })),

  toggleToolbarOrientation: () => set((state: any) => ({
    toolbarOrientation: state.toolbarOrientation === "horizontal" ? "vertical" : "horizontal",
  })),

  setToolbarPosition: (pos) => set({ toolbarPosition: pos }),

  togglePanel: () => set((state: any) => ({ panelOpen: !state.panelOpen })),
  setPanelPosition: (pos) => set({ panelPosition: pos }),

  setTheme: (theme) => {
    document.body.classList.toggle("light-theme", theme === "light");
    document.body.classList.toggle("paper-theme", theme === "paper");
    set({ theme });
  },

  toggleTheme: () =>
    set((state: any) => {
      const next = state.theme === "dark" ? "light" : state.theme === "light" ? "paper" : "dark";
      document.body.classList.toggle("light-theme", next === "light");
      document.body.classList.toggle("paper-theme", next === "paper");
      return { theme: next };
    }),

  startPresentation: () => {
    const state = (get as any)();
    const pageIdx = state.pages.findIndex((p: any) => p.id === state.activePageId);
    set({ presentationMode: true, presentationSlideIndex: pageIdx >= 0 ? pageIdx : 0 });
  },

  exitPresentation: () => set({ presentationMode: false }),

  nextSlide: () =>
    set((state: any) => {
      const pageIdx = state.pages.findIndex((p: any) => p.id === state.activePageId);
      if (pageIdx < state.pages.length - 1) {
        const nextIdx = pageIdx + 1;
        const nextPage = state.pages[nextIdx];
        // Save current page state
        const pages = [...state.pages];
        pages[pageIdx] = { ...pages[pageIdx], elements: state.elements };
        const cache = { ...state.pageStateCache };
        cache[state.activePageId] = {
          elements: state.elements,
          selectedIds: state.selectedIds,
          viewTransform: state.viewTransform,
          history: state.history,
          historyIndex: state.historyIndex,
        };
        const cached = cache[nextPage.id];
        return {
          pages,
          activePageId: nextPage.id,
          pageStateCache: cache,
          elements: cached ? cached.elements : nextPage.elements,
          selectedIds: [],
          viewTransform: cached ? cached.viewTransform : { x: 0, y: 0, zoom: 1 },
          history: cached ? cached.history : [nextPage.elements ? [...nextPage.elements] : []],
          historyIndex: cached ? cached.historyIndex : 0,
          presentationSlideIndex: nextIdx,
        };
      }
      return state;
    }),

  prevSlide: () =>
    set((state: any) => {
      const pageIdx = state.pages.findIndex((p: any) => p.id === state.activePageId);
      if (pageIdx > 0) {
        const prevIdx = pageIdx - 1;
        const prevPage = state.pages[prevIdx];
        // Save current page state
        const pages = [...state.pages];
        pages[pageIdx] = { ...pages[pageIdx], elements: state.elements };
        const cache = { ...state.pageStateCache };
        cache[state.activePageId] = {
          elements: state.elements,
          selectedIds: state.selectedIds,
          viewTransform: state.viewTransform,
          history: state.history,
          historyIndex: state.historyIndex,
        };
        const cached = cache[prevPage.id];
        return {
          pages,
          activePageId: prevPage.id,
          pageStateCache: cache,
          elements: cached ? cached.elements : prevPage.elements,
          selectedIds: [],
          viewTransform: cached ? cached.viewTransform : { x: 0, y: 0, zoom: 1 },
          history: cached ? cached.history : [prevPage.elements ? [...prevPage.elements] : []],
          historyIndex: cached ? cached.historyIndex : 0,
          presentationSlideIndex: prevIdx,
        };
      }
      return state;
    }),
});
