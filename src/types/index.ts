export type Tool =
  | "select"
  | "hand"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "freehand"
  | "text"
  | "mermaid";

export type FillStyle = "hachure" | "cross-hatch" | "solid" | "none";
export type StrokeStyle = "solid" | "dashed" | "dotted";

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
}

export interface ShapeElement extends DrawElementBase {
  type: "rectangle" | "ellipse" | "diamond";
}

export interface LineElement extends DrawElementBase {
  type: "line" | "arrow";
  points: [number, number][];
  endArrowhead: boolean;
  startArrowhead: boolean;
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

export interface MermaidNode {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  shape: "rect" | "diamond" | "circle" | "stadium" | "hexagon";
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

export type DrawElement = ShapeElement | LineElement | FreehandElement | TextElement | MermaidElement;

export interface ViewTransform {
  x: number;
  y: number;
  zoom: number;
}

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
  history: DrawElement[][];
  historyIndex: number;
  clipboard: DrawElement[];
  filePath: string | null;
  showTextInput: { x: number; y: number; screenX: number; screenY: number } | null;
  showMermaidInput: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null;
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
  setShowTextInput: (pos: { x: number; y: number; screenX: number; screenY: number } | null) => void;
  setShowMermaidInput: (pos: { x: number; y: number; screenX: number; screenY: number; editId?: string } | null) => void;
  setIsDrawing: (drawing: boolean) => void;
  setIsPanning: (panning: boolean) => void;
  setPanStart: (start: { x: number; y: number } | null) => void;
  setDrawStart: (start: { x: number; y: number } | null) => void;
}
