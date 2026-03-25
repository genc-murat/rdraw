import type { DrawElement, FillStyle, StrokeStyle, Tool } from "../../types";
import type { StoreCreator } from "./types";
import { measureText } from "../../utils/geometry";
import {
  DEFAULT_STROKE_COLOR,
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_ROUGHNESS,
  DEFAULT_OPACITY,
  DEFAULT_FONT_SIZE,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_HIGHLIGHT_STROKE_WIDTH,
  DEFAULT_HIGHLIGHT_OPACITY,
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_TEXT_COLOR,
  DEFAULT_NOTE_FONT_SIZE,
  C4_COLORS,
} from "../../utils/constants";

export interface ToolState {
  activeTool: Tool;
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeStyle: StrokeStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
  fontSize: number;
}

export interface ToolActions {
  setTool: (tool: Tool) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setFillStyle: (style: FillStyle) => void;
  setStrokeStyle: (style: StrokeStyle) => void;
  setStrokeWidth: (width: number) => void;
  setRoughness: (roughness: number) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
}

export const initialToolState: ToolState = {
  activeTool: "select",
  strokeColor: DEFAULT_STROKE_COLOR,
  fillColor: DEFAULT_FILL_COLOR,
  fillStyle: "hachure",
  strokeStyle: "solid",
  strokeWidth: DEFAULT_STROKE_WIDTH,
  roughness: DEFAULT_ROUGHNESS,
  opacity: DEFAULT_OPACITY,
  fontSize: DEFAULT_FONT_SIZE,
};

export const createToolSlice: StoreCreator<ToolState & ToolActions> = (set, get) => ({
  ...initialToolState,

  setTool: (tool) => {
    const updates: Record<string, any> = { activeTool: tool, selectedIds: [] };
    if (tool === "highlight") {
      updates.strokeColor = DEFAULT_HIGHLIGHT_COLOR;
      updates.strokeWidth = DEFAULT_HIGHLIGHT_STROKE_WIDTH;
      updates.opacity = DEFAULT_HIGHLIGHT_OPACITY;
    } else if (tool === "note") {
      updates.fillColor = DEFAULT_NOTE_COLOR;
      updates.fillStyle = "solid";
      updates.strokeColor = DEFAULT_NOTE_TEXT_COLOR;
      updates.strokeWidth = DEFAULT_STROKE_WIDTH;
      updates.opacity = DEFAULT_OPACITY;
      updates.fontSize = DEFAULT_NOTE_FONT_SIZE;
    } else if (C4_COLORS[tool]) {
      const c4 = C4_COLORS[tool];
      updates.strokeColor = c4.stroke;
      updates.fillColor = c4.fill;
      updates.fillStyle = "solid";
      updates.strokeWidth = DEFAULT_STROKE_WIDTH;
      updates.opacity = DEFAULT_OPACITY;
    } else {
      updates.strokeColor = DEFAULT_STROKE_COLOR;
      updates.strokeWidth = DEFAULT_STROKE_WIDTH;
      updates.opacity = DEFAULT_OPACITY;
    }
    set(updates);
  },

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
      const el = state.elements.find((e: DrawElement) => e.id === id);
      if (el && el.type === "text") {
        const textEl = el as any;
        const measured = measureText(textEl.text, size);
        state.updateElement(id, {
          fontSize: size,
          width: measured.width,
          height: measured.height,
        } as any);
      } else if (el && el.type === "note") {
        const noteEl = el as any;
        if (noteEl.text) {
          const measured = measureText(noteEl.text, size);
          state.updateElement(id, {
            fontSize: size,
            width: measured.width + 32,
            height: measured.height + 24,
          } as any);
        } else {
          state.updateElement(id, { fontSize: size } as any);
        }
      }
    }
  },
});
