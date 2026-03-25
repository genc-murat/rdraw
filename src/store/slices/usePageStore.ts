import type { DrawElement, Page, PageStateCache } from "../../types";
import type { StoreCreator } from "./types";
import { generateId, generateSeed, generatePageId } from "../../utils/ids";
import { MAX_PAGES } from "../../utils/constants";

export interface PageState {
  filePath: string | null;
  pages: Page[];
  activePageId: string;
  pageStateCache: Record<string, PageStateCache>;
}

export interface PageActions {
  setFilePath: (path: string | null) => void;
  clearAll: () => void;
  switchPage: (id: string) => void;
  createPage: (name?: string) => void;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  duplicatePage: (id: string) => void;
  reorderPage: (fromIndex: number, toIndex: number) => void;
}

export const initialPageState: PageState = {
  filePath: null,
  pages: [{ id: "page-default", name: "Page 1", elements: [] }],
  activePageId: "page-default",
  pageStateCache: {},
};

export const createPageSlice: StoreCreator<PageState & PageActions> = (set, get) => ({
  ...initialPageState,

  setFilePath: (path) => set({ filePath: path }),

  clearAll: () =>
    set({
      elements: [],
      selectedIds: [],
      pages: [{ id: "page-default", name: "Page 1", elements: [] }],
      activePageId: "page-default",
      pageStateCache: {},
      history: [[]],
      historyIndex: 0,
    }),

  switchPage: (id) =>
    set((state: any) => {
      if (id === state.activePageId) return state;
      const pages = [...state.pages];
      const prevIdx = pages.findIndex((p: Page) => p.id === state.activePageId);
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
      const page = pages.find((p: Page) => p.id === id);
      return {
        pages,
        activePageId: id,
        pageStateCache: cache,
        elements: page ? page.elements : [],
        selectedIds: [],
        viewTransform: { x: 0, y: 0, zoom: 1 },
        history: [page ? [...page.elements] : []],
        historyIndex: 0,
      };
    }),

  createPage: (name) => {
    const state = get();
    if (state.pages.length >= MAX_PAGES) return;
    let pageName = name;
    if (!pageName) {
      let n = state.pages.length + 1;
      const existing = new Set(state.pages.map((p: Page) => p.name));
      while (existing.has(`Page ${n}`)) n++;
      pageName = `Page ${n}`;
    }
    const newPage = { id: generatePageId(), name: pageName, elements: [] };
    set((s: any) => ({ pages: [...s.pages, newPage] }));
    get().switchPage(newPage.id);
  },

  deletePage: (id) => {
    const state = get();
    if (state.pages.length <= 1) return;
    if (id === state.activePageId) {
      const idx = state.pages.findIndex((p: Page) => p.id === id);
      const nextIdx = idx < state.pages.length - 1 ? idx + 1 : idx - 1;
      get().switchPage(state.pages[nextIdx].id);
    }
    set((s: any) => {
      const pages = s.pages.filter((p: Page) => p.id !== id);
      const cache = { ...s.pageStateCache };
      delete cache[id];
      return { pages, pageStateCache: cache };
    });
  },

  renamePage: (id, name) =>
    set((state: any) => ({
      pages: state.pages.map((p: Page) => (p.id === id ? { ...p, name } : p)),
    })),

  duplicatePage: (id) => {
    const state = get();
    const sourcePage = state.pages.find((p: Page) => p.id === id);
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
    const existing = new Set(state.pages.map((p: Page) => p.name));
    while (existing.has(`${sourcePage.name} (${n})`)) n++;
    const newPage = {
      id: generatePageId(),
      name: `${sourcePage.name} (${n})`,
      elements: newElements,
    };
    set((s: any) => ({ pages: [...s.pages, newPage] }));
    get().switchPage(newPage.id);
  },

  reorderPage: (fromIndex, toIndex) =>
    set((state: any) => {
      const pages = [...state.pages];
      const [moved] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, moved);
      return { pages };
    }),
});
