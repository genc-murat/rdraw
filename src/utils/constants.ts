import type { ArrowheadStyle } from "../types";

export const DEFAULT_STROKE_COLOR = "#e0e0e0";
export const DEFAULT_FILL_COLOR = "transparent";
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_ROUGHNESS = 1;
export const DEFAULT_OPACITY = 1;
export const DEFAULT_FONT_SIZE = 20;
export const DEFAULT_FONT_FAMILY = "sans-serif";
export const HISTORY_LIMIT = 50;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 10;
export const DEFAULT_BORDER_RADIUS = 0;
export const DEFAULT_ARROWHEAD_STYLE: ArrowheadStyle = "arrow";
export const DEFAULT_START_ARROWHEAD_STYLE: ArrowheadStyle = "none";

export const COLORS = [
  "#e0e0e0", "#868e96", "#fa5252", "#e64980", "#be4bdb",
  "#7950f2", "#4c6ef5", "#228be6", "#15aabf", "#12b886",
  "#40c057", "#82c91e", "#fab005", "#fd7e14", "#000000",
  "#ffffff", "#ffc9c9", "#ffdeeb", "#d0bfff", "#bac8ff",
  "#a5d8ff", "#99e9f2", "#96f2d7", "#b2f2bb", "#d8f5a2",
  "#ffec99", "#ffe066", "#ffd43b", "#fcc419", "#ffa94d",
];

export const HIGHLIGHT_COLORS = [
  "#ffeb3b", "#69f0ae", "#ff4081", "#ffab40", "#40c4ff", "#ff5252",
];

export const DEFAULT_HIGHLIGHT_COLOR = "#ffeb3b";
export const DEFAULT_HIGHLIGHT_STROKE_WIDTH = 16;
export const DEFAULT_HIGHLIGHT_OPACITY = 0.35;

export const DEFAULT_PAGE_NAME = "Page 1";
export const MAX_PAGES = 40;

export const DEFAULT_NOTE_COLOR = "#fff59d";
export const DEFAULT_NOTE_TEXT_COLOR = "#1e1e1e";
export const DEFAULT_NOTE_FONT_SIZE = 16;
export const NOTE_PADDING_X = 16;
export const NOTE_PADDING_Y = 12;
export const NOTE_FOLD_SIZE = 20;

export const CALLOUT_PADDING_X = 12;
export const CALLOUT_PADDING_Y = 8;
export const CALLOUT_TAIL_SIZE = 20;

export const C4_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  "c4-person": { fill: "#08427b", stroke: "#073b6f", text: "#ffffff" },
  "c4-software-system": { fill: "#1168bd", stroke: "#0d5aa7", text: "#ffffff" },
  "c4-container": { fill: "#438dd5", stroke: "#3a7cbf", text: "#ffffff" },
  "c4-component": { fill: "#85bbf0", stroke: "#6eabe3", text: "#000000" },
  "c4-database": { fill: "#438dd5", stroke: "#3a7cbf", text: "#ffffff" },
  "c4-system-boundary": { fill: "transparent", stroke: "#888888", text: "#888888" },
  "c4-enterprise-boundary": { fill: "transparent", stroke: "#888888", text: "#888888" },
  "c4-relationship": { fill: "transparent", stroke: "#707070", text: "#707070" },
};

export const C4_DEFAULT_WIDTH = 200;
export const C4_DEFAULT_HEIGHT = 120;
export const C4_BOUNDARY_DEFAULT_WIDTH = 400;
export const C4_BOUNDARY_DEFAULT_HEIGHT = 300;
export const C4_FONT_SIZE = 12;
export const C4_DESC_FONT_SIZE = 10;
export const C4_TECH_FONT_SIZE = 9;

export const GRID_SIZE = 20;
export const SNAP_THRESHOLD = 5;
export const SNAP_GUIDE_COLOR = "rgba(255, 0, 255, 0.5)";
