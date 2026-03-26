import type { DrawElement } from "../../types";
import type { StoreCreator } from "./types";
import { generateId, generateSeed, generateGroupId } from "../../utils/ids";
import { HISTORY_LIMIT } from "../../utils/constants";

function cloneElementsWithOffset(
  sourceElements: DrawElement[],
  offset: number
): DrawElement[] {
  const groupIds = new Set(sourceElements.map((el) => el.groupId).filter(Boolean));
  const newGroupId = groupIds.size === 1 ? generateGroupId() : undefined;
  return sourceElements.map((el) => ({
    ...el,
    id: generateId(),
    x: el.x + offset,
    y: el.y + offset,
    seed: generateSeed(),
    groupId: el.groupId ? newGroupId : undefined,
  }));
}

export interface DrawingState {
  elements: DrawElement[];
  selectedIds: string[];
  history: DrawElement[][];
  historyIndex: number;
  clipboard: DrawElement[];
}

export interface DrawingActions {
  addElement: (element: DrawElement) => void;
  updateElement: (id: string, updates: Partial<DrawElement>) => void;
  removeElement: (id: string) => void;
  removeElements: (ids: string[]) => void;
  selectElement: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  setElements: (elements: DrawElement[]) => void;
  group: () => void;
  ungroup: () => void;
}

export const initialDrawingState: DrawingState = {
  elements: [],
  selectedIds: [],
  history: [[]],
  historyIndex: 0,
  clipboard: [],
};

export const createDrawingSlice: StoreCreator<DrawingState & DrawingActions> = (set, get) => ({
  ...initialDrawingState,

  addElement: (element) =>
    set((state: any) => ({ elements: [...state.elements, element] })),

  updateElement: (id, updates) =>
    set((state: any) => ({
      elements: state.elements.map((el: DrawElement) =>
        el.id === id ? { ...el, ...updates } as DrawElement : el
      ),
    })),

  removeElement: (id) =>
    set((state: any) => ({
      elements: state.elements.filter((el: DrawElement) => el.id !== id),
      selectedIds: state.selectedIds.filter((sid: string) => sid !== id),
    })),

  removeElements: (ids) => {
    get().pushHistory();
    set((state: any) => {
      const idSet = new Set(ids);
      const elements = state.elements
        .filter((el: DrawElement) => !idSet.has(el.id))
        .map((el: DrawElement) => {
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
    });
  },

  selectElement: (id, multi) =>
    set((state: any) => {
      if (multi) {
        return {
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((sid: string) => sid !== id)
            : [...state.selectedIds, id],
        };
      }
      const el = state.elements.find((e: DrawElement) => e.id === id);
      if (el?.groupId) {
        const groupIds = state.elements
          .filter((e: DrawElement) => e.groupId === el.groupId)
          .map((e: DrawElement) => e.id);
        return { selectedIds: groupIds };
      }
      return { selectedIds: [id] };
    }),

  clearSelection: () => set({ selectedIds: [] }),

  selectAll: () =>
    set((state: any) => ({
      selectedIds: state.elements.map((el: DrawElement) => el.id),
    })),

  pushHistory: () =>
    set((state: any) => {
      const snapshot = [...state.elements];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > HISTORY_LIMIT) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }),

  undo: () =>
    set((state: any) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        elements: [...state.history[newIndex]],
        historyIndex: newIndex,
        selectedIds: [],
      };
    }),

  redo: () =>
    set((state: any) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        elements: [...state.history[newIndex]],
        historyIndex: newIndex,
        selectedIds: [],
      };
    }),

  copy: () =>
    set((state: any) => {
      const selected = state.elements.filter((el: DrawElement) =>
        state.selectedIds.includes(el.id)
      );
      return { clipboard: JSON.parse(JSON.stringify(selected)) };
    }),

  cut: () => {
    const state = get();
    const selected = state.elements.filter((el: DrawElement) =>
      state.selectedIds.includes(el.id)
    );
    state.pushHistory();
    set({
      clipboard: JSON.parse(JSON.stringify(selected)),
      elements: state.elements.filter(
        (el: DrawElement) => !state.selectedIds.includes(el.id)
      ),
      selectedIds: [],
    });
  },

  paste: () => {
    const state = get();
    if (state.clipboard.length === 0) return;
    const newElements = cloneElementsWithOffset(state.clipboard, 20);
    state.pushHistory();
    set({
      elements: [...state.elements, ...newElements],
      selectedIds: newElements.map((el: DrawElement) => el.id),
      clipboard: JSON.parse(JSON.stringify(newElements)),
    });
  },

  duplicate: () => {
    const state = get();
    const selected = state.elements.filter((el: DrawElement) =>
      state.selectedIds.includes(el.id)
    );
    const newElements = cloneElementsWithOffset(selected, 20);
    state.pushHistory();
    set((s: any) => ({
      elements: [...s.elements, ...newElements],
      selectedIds: newElements.map((el: DrawElement) => el.id),
    }));
  },

  bringToFront: () => {
    const state = get();
    state.pushHistory();
    set((s: any) => {
      const selected = s.elements.filter((el: DrawElement) =>
        s.selectedIds.includes(el.id)
      );
      const rest = s.elements.filter(
        (el: DrawElement) => !s.selectedIds.includes(el.id)
      );
      return { elements: [...rest, ...selected] };
    });
  },

  sendToBack: () => {
    const state = get();
    state.pushHistory();
    set((s: any) => {
      const selected = s.elements.filter((el: DrawElement) =>
        s.selectedIds.includes(el.id)
      );
      const rest = s.elements.filter(
        (el: DrawElement) => !s.selectedIds.includes(el.id)
      );
      return { elements: [...selected, ...rest] };
    });
  },

  setElements: (elements) =>
    set((state: any) => ({
      elements,
      pages: state.pages.map((p: any) =>
        p.id === state.activePageId ? { ...p, elements } : p
      ),
    })),

  group: () => {
    const state = get();
    if (state.selectedIds.length < 2) return;
    const groupId = generateGroupId();
    state.pushHistory();
    set((s: any) => ({
      elements: s.elements.map((el: DrawElement) =>
        s.selectedIds.includes(el.id) ? { ...el, groupId } : el
      ),
    }));
  },

  ungroup: () => {
    const state = get();
    const groupIds = new Set<string>();
    for (const id of state.selectedIds) {
      const el = state.elements.find((e: DrawElement) => e.id === id);
      if (el?.groupId) groupIds.add(el.groupId);
    }
    if (groupIds.size === 0) return;
    state.pushHistory();
    set((s: any) => ({
      elements: s.elements.map((el: DrawElement) =>
        el.groupId && groupIds.has(el.groupId) ? { ...el, groupId: undefined } : el
      ),
    }));
  },
});
