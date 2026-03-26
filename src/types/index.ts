export type Tool =
  | "select"
  | "hand"
  | "rectangle"
  | "rounded-rectangle"
  | "ellipse"
  | "diamond"
  | "star"
  | "hexagon"
  | "line"
  | "arrow"
  | "freehand"
  | "highlight"
  | "text"
  | "note"
  | "callout"
  | "mermaid"
  | "c4-person"
  | "c4-software-system"
  | "c4-container"
  | "c4-component"
  | "c4-database"
  | "c4-system-boundary"
  | "c4-enterprise-boundary"
  | "c4-relationship"
  | "laser";

export type FillStyle = "hachure" | "cross-hatch" | "solid" | "none" | "zigzag" | "dots" | "dashed" | "zigzag-line";
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type ArrowheadStyle = "none" | "arrow" | "triangle" | "circle" | "diamond" | "bar";

export interface DrawElementBase {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeStyle: StrokeStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  rotation: number;
  seed: number;
  groupId?: string;
  borderRadius?: number;
}

export interface ShapeElement extends DrawElementBase {
  type: "rectangle" | "rounded-rectangle" | "ellipse" | "diamond" | "star" | "hexagon";
}

export interface LineElement extends DrawElementBase {
  type: "line" | "arrow";
  points: [number, number][];
  endArrowhead: ArrowheadStyle;
  startArrowhead: ArrowheadStyle;
  startElementId?: string;
  endElementId?: string;
  startAnchor?: "top" | "right" | "bottom" | "left" | "center";
  endAnchor?: "top" | "right" | "bottom" | "left" | "center";
  routing?: "free" | "orthogonal";
}

export interface FreehandElement extends DrawElementBase {
  type: "freehand";
  points: [number, number][];
}

export interface TextElement extends DrawElementBase {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface NoteElement extends DrawElementBase {
  type: "note";
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface CalloutElement extends DrawElementBase {
  type: "callout";
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface MermaidNode {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  shape: "rect" | "diamond" | "circle" | "stadium" | "hexagon" | "state-start" | "state-end";
}

export interface MermaidEdge {
  points: [number, number][];
  label?: string;
}

export interface MermaidElement extends DrawElementBase {
  type: "mermaid";
  code: string;
  renderedNodes: MermaidNode[];
  renderedEdges: MermaidEdge[];
  originalWidth: number;
  originalHeight: number;
}

export type C4Type =
  | "c4-person"
  | "c4-software-system"
  | "c4-container"
  | "c4-component"
  | "c4-database"
  | "c4-system-boundary"
  | "c4-enterprise-boundary";

export interface C4Element extends DrawElementBase {
  type: "c4-person" | "c4-software-system" | "c4-container" | "c4-component" | "c4-database" | "c4-system-boundary" | "c4-enterprise-boundary";
  c4Type: C4Type;
  label: string;
  description: string;
  technology: string;
}

export interface C4RelationshipElement extends DrawElementBase {
  type: "c4-relationship";
  points: [number, number][];
  endArrowhead: ArrowheadStyle;
  startArrowhead: ArrowheadStyle;
  label: string;
  startElementId?: string;
  endElementId?: string;
  startAnchor?: "top" | "right" | "bottom" | "left" | "center";
  endAnchor?: "top" | "right" | "bottom" | "left" | "center";
}

export type DrawElement = ShapeElement | LineElement | FreehandElement | TextElement | NoteElement | CalloutElement | MermaidElement | C4Element | C4RelationshipElement;

export interface Page {
  id: string;
  name: string;
  elements: DrawElement[];
}

export interface ViewTransform {
  x: number;
  y: number;
  zoom: number;
}

export type PageStateCache = {
  elements: DrawElement[];
  selectedIds: string[];
  viewTransform: ViewTransform;
  history: DrawElement[][];
  historyIndex: number;
};

export interface AppState {
  elements: DrawElement[];
  selectedIds: string[];
  activeTool: Tool;
  viewTransform: ViewTransform;
  isDrawing: boolean;
  isPanning: boolean;
  panStart: { x: number; y: number } | null;
  drawStart: { x: number; y: number } | null;
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeStyle: StrokeStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  fontSize: number;
  borderRadius: number;
  endArrowheadStyle: ArrowheadStyle;
  startArrowheadStyle: ArrowheadStyle;
  connectorRouting: "free" | "orthogonal";
  history: DrawElement[][];
  historyIndex: number;
  clipboard: DrawElement[];
  filePath: string | null;
  showTextInput: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null;
  showMermaidInput: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null;
  showC4LabelInput: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null;
  showGrid: boolean;
  toolbarOrientation: "horizontal" | "vertical";
  toolbarPosition: { x: number; y: number };
  panelOpen: boolean;
  panelPosition: { x: number; y: number };
  theme: "dark" | "light" | "paper";
  pages: Page[];
  activePageId: string;
  pageStateCache: Record<string, PageStateCache>;
  libraryPanelOpen: boolean;
  libraryItems: LibraryItem[];
  remoteLibraries: RemoteLibrary[];
  searchQuery: string;
  activeLibraryTab: "local" | "browse";
}

export interface AppActions {
  setTool: (tool: Tool) => void;
  addElement: (element: DrawElement) => void;
  updateElement: (id: string, updates: Partial<DrawElement>) => void;
  removeElement: (id: string) => void;
  removeElements: (ids: string[]) => void;
  selectElement: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setViewTransform: (transform: Partial<ViewTransform>) => void;
  resetView: () => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  setElements: (elements: DrawElement[]) => void;
  clearAll: () => void;
  setFilePath: (path: string | null) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setFillStyle: (style: FillStyle) => void;
  setStrokeStyle: (style: StrokeStyle) => void;
  setStrokeWidth: (width: number) => void;
  setRoughness: (roughness: number) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setBorderRadius: (radius: number) => void;
  setEndArrowheadStyle: (style: ArrowheadStyle) => void;
  setStartArrowheadStyle: (style: ArrowheadStyle) => void;
  setConnectorRouting: (routing: "free" | "orthogonal") => void;
  setShowTextInput: (pos: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null) => void;
  setShowMermaidInput: (pos: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null) => void;
  setShowC4LabelInput: (pos: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null) => void;
  setIsDrawing: (drawing: boolean) => void;
  setIsPanning: (panning: boolean) => void;
  setPanStart: (start: { x: number; y: number } | null) => void;
  setDrawStart: (start: { x: number; y: number } | null) => void;
  setShowGrid: (show: boolean) => void;
  toggleGrid: () => void;
  toggleToolbarOrientation: () => void;
  setToolbarPosition: (pos: { x: number; y: number }) => void;
  togglePanel: () => void;
  setPanelPosition: (pos: { x: number; y: number }) => void;
  setTheme: (theme: "dark" | "light" | "paper") => void;
  toggleTheme: () => void;
  createPage: (name?: string) => void;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  duplicatePage: (id: string) => void;
  reorderPage: (fromIndex: number, toIndex: number) => void;
  switchPage: (id: string) => void;
  group: () => void;
  ungroup: () => void;
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

// Library types
export interface LibraryItem {
  id: string;
  name: string;
  elements: DrawElement[];
  created: number;
  status: "published" | "unpublished";
  author?: string;
  category?: string;
}

export interface LibraryFile {
  type: "excalidrawlib";
  version: number;
  libraryItems: LibraryItem[];
}

export interface RemoteLibraryAuthor {
  name: string;
  url?: string;
}

export interface RemoteLibrary {
  name: string;
  authors: RemoteLibraryAuthor[];
  source: string;
  preview?: string;
  total: number;
  created: number;
  updated: number;
  description?: string;
  items?: LibraryItem[];
  loading?: boolean;
}
