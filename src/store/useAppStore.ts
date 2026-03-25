import { create } from "zustand";
import type { AppState, AppActions } from "../types";
import { createDrawingSlice, initialDrawingState } from "./slices/useDrawingStore";
import { createToolSlice, initialToolState } from "./slices/useToolStore";
import { createViewSlice, initialViewState } from "./slices/useViewStore";
import { createPageSlice, initialPageState } from "./slices/usePageStore";
import { createLibrarySlice, initialLibraryState } from "./slices/useLibraryStore";

type Store = AppState & AppActions;

const useAppStore = create<Store>((set, get) => ({
  ...initialDrawingState,
  ...initialToolState,
  ...initialViewState,
  ...initialPageState,
  ...initialLibraryState,

  ...createDrawingSlice(set as any, get as any),
  ...createToolSlice(set as any, get as any),
  ...createViewSlice(set as any, get as any),
  ...createPageSlice(set as any, get as any),
  ...createLibrarySlice(set as any, get as any),
}));

export default useAppStore;
