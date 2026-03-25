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
  theme: "dark" | "light";
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
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
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
};

export const createViewSlice: StoreCreator<ViewState & ViewActions> = (set) => ({
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
    set({ theme });
  },

  toggleTheme: () =>
    set((state: any) => {
      const next = state.theme === "dark" ? "light" : "dark";
      document.body.classList.toggle("light-theme", next === "light");
      return { theme: next };
    }),
});
