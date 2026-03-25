import type { LibraryItem, RemoteLibrary, DrawElement } from "../../types";
import type { StoreCreator } from "./types";
import { invoke } from "@tauri-apps/api/core";
import { generateId, generateSeed } from "../../utils/ids";
import {
  loadPersistedLibrary,
  persistLibrary,
  parseLibraryFile,
  convertLibraryItems,
  fetchRemoteLibraries as fetchRemote,
  fetchRemoteLibraryItems,
  createExportLibraryData,
  isFilePath,
} from "../../utils/library";

export interface LibraryState {
  libraryItems: LibraryItem[];
  remoteLibraries: RemoteLibrary[];
  searchQuery: string;
  libraryPanelOpen: boolean;
  activeLibraryTab: "local" | "browse";
}

export interface LibraryActions {
  toggleLibraryPanel: () => void;
  addLibraryItem: (item: LibraryItem) => void;
  removeLibraryItem: (id: string) => void;
  importLibraryFromFile: (fileContent: string) => void;
  importRemoteLibrary: (library: RemoteLibrary) => Promise<void>;
  exportLibrary: () => void;
  insertLibraryItem: (id: string) => void;
  insertLibraryItemElements: (elements: DrawElement[]) => void;
  setSearchQuery: (query: string) => void;
  setActiveLibraryTab: (tab: "local" | "browse") => void;
  fetchRemoteLibraries: () => Promise<void>;
}

export const initialLibraryState: LibraryState = {
  libraryItems: loadPersistedLibrary(),
  remoteLibraries: [],
  searchQuery: "",
  libraryPanelOpen: false,
  activeLibraryTab: "local",
};

export const createLibrarySlice: StoreCreator<LibraryState & LibraryActions> = (set, get) => ({
  ...initialLibraryState,

  toggleLibraryPanel: () =>
    set((state: any) => ({ libraryPanelOpen: !state.libraryPanelOpen })),

  addLibraryItem: (item) =>
    set((state: any) => {
      const items = [item, ...state.libraryItems];
      persistLibrary(items);
      return { libraryItems: items };
    }),

  removeLibraryItem: (id) =>
    set((state: any) => {
      const items = state.libraryItems.filter((i: LibraryItem) => i.id !== id);
      persistLibrary(items);
      return { libraryItems: items };
    }),

  importLibraryFromFile: (fileContent) => {
    if (isFilePath(fileContent)) {
      const path = fileContent.trim();
      invoke<string>("open_file", { path }).then((content) => {
        const libFile = parseLibraryFile(content);
        if (!libFile) {
          alert("Invalid library file format");
          return;
        }
        const items = convertLibraryItems(libFile.libraryItems);
        if (items.length === 0) {
          alert("No valid items found in library file");
          return;
        }
        set((state: any) => {
          const existing = new Set(state.libraryItems.map((i: LibraryItem) => i.id));
          const newItems = items.filter((i: LibraryItem) => !existing.has(i.id));
          const merged = [...newItems, ...state.libraryItems];
          persistLibrary(merged);
          return { libraryItems: merged };
        });
      }).catch((err) => {
        alert("Failed to read library file: " + (err instanceof Error ? err.message : String(err)));
      });
      return;
    }
    const libFile = parseLibraryFile(fileContent);
    if (!libFile) {
      alert("Invalid library file format");
      return;
    }
    const items = convertLibraryItems(libFile.libraryItems);
    if (items.length === 0) {
      alert("No valid items found in library file");
      return;
    }
    set((state: any) => {
      const existing = new Set(state.libraryItems.map((i: LibraryItem) => i.id));
      const newItems = items.filter((i: LibraryItem) => !existing.has(i.id));
      const merged = [...newItems, ...state.libraryItems];
      persistLibrary(merged);
      return { libraryItems: merged };
    });
  },

  importRemoteLibrary: async (library) => {
    if (!library.source) return;
    set((state: any) => ({
      remoteLibraries: state.remoteLibraries.map((r: RemoteLibrary) =>
        r.source === library.source ? { ...r, loading: true } : r
      ),
    }));
    const items = await fetchRemoteLibraryItems(library.source);
    set((state: any) => {
      const existing = new Set(state.libraryItems.map((i: LibraryItem) => i.id));
      const newItems = items.filter((i: LibraryItem) => !existing.has(i.id));
      const merged = [...newItems, ...state.libraryItems];
      persistLibrary(merged);
      return {
        libraryItems: merged,
        remoteLibraries: state.remoteLibraries.map((r: RemoteLibrary) =>
          r.source === library.source ? { ...r, loading: false, items } : r
        ),
      };
    });
  },

  exportLibrary: () => {
    const state = get();
    const json = createExportLibraryData(state.libraryItems);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rdraw-library.excalidrawlib";
    a.click();
    URL.revokeObjectURL(url);
  },

  insertLibraryItem: (id) => {
    const state = get();
    const item = state.libraryItems.find((i: LibraryItem) => i.id === id);
    if (!item || item.elements.length === 0) return;
    get().insertLibraryItemElements(item.elements);
  },

  insertLibraryItemElements: (elements) => {
    const state = get();
    const viewTransform = state.viewTransform;
    const canvasW = typeof window !== "undefined" ? window.innerWidth : 800;
    const canvasH = typeof window !== "undefined" ? window.innerHeight : 600;

    let minX = Infinity, minY = Infinity;
    for (const el of elements) {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
    }

    const centerX = (-viewTransform.x + canvasW / 2) / viewTransform.zoom;
    const centerY = (-viewTransform.y + canvasH / 2) / viewTransform.zoom;
    const offsetX = centerX - minX;
    const offsetY = centerY - minY;

    const newElements = elements.map((el) => ({
      ...el,
      id: generateId(),
      x: el.x + offsetX,
      y: el.y + offsetY,
      seed: generateSeed(),
    }));

    state.pushHistory();
    set((s: any) => ({
      elements: [...s.elements, ...newElements],
      selectedIds: newElements.map((e: DrawElement) => e.id),
    }));
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setActiveLibraryTab: (tab) => set({ activeLibraryTab: tab }),

  fetchRemoteLibraries: async () => {
    const libs = await fetchRemote();
    set({ remoteLibraries: libs });
  },
});
