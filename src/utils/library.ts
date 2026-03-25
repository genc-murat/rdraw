import type { DrawElement, LibraryItem, LibraryFile, RemoteLibrary } from "../types";
import { generateId, generateSeed } from "./ids";

const STORAGE_KEY = "rdraw-library";
const REMOTE_LIBRARIES_URL = "https://raw.githubusercontent.com/excalidraw/excalidraw-libraries/master/libraries.json";

interface ExcalidrawLibElement {
  type: string;
  version?: number;
  versionNonce?: number;
  isDeleted?: boolean;
  id: string;
  fillStyle?: string;
  strokeWidth?: number;
  strokeStyle?: string;
  roughness?: number;
  opacity?: number;
  angle?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  seed?: number;
  groupIds?: string[];
  strokeColor?: string;
  backgroundColor?: string;
  points?: [number, number][];
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  verticalAlign?: string;
  endArrowhead?: string | null;
  startArrowhead?: string | null;
}

function mapFillStyle(style: string | undefined): "hachure" | "cross-hatch" | "solid" | "none" {
  if (style === "solid") return "solid";
  if (style === "cross-hatch") return "cross-hatch";
  if (style === "none") return "none";
  return "hachure";
}

function mapStrokeStyle(style: string | undefined): "solid" | "dashed" | "dotted" {
  if (style === "dashed") return "dashed";
  if (style === "dotted") return "dotted";
  return "solid";
}

function mapArrowhead(head: string | null | undefined): "none" | "arrow" | "triangle" | "circle" | "diamond" | "bar" {
  if (!head || head === "none") return "none";
  if (head === "arrow") return "arrow";
  if (head === "triangle") return "triangle";
  if (head === "circle") return "circle";
  if (head === "diamond") return "diamond";
  if (head === "bar") return "bar";
  return "arrow";
}

function mapFontFamily(family: number | undefined): string {
  if (family === 1) return "Virgil";
  if (family === 2) return "Cascadia";
  if (family === 3) return "Assistant";
  return "sans-serif";
}

export function convertExcalidrawElement(el: ExcalidrawLibElement): DrawElement | null {
  const base = {
    id: generateId(),
    x: el.x || 0,
    y: el.y || 0,
    width: Math.abs(el.width || 100),
    height: Math.abs(el.height || 100),
    strokeColor: el.strokeColor || "#e0e0e0",
    fillColor: el.backgroundColor === "transparent" || !el.backgroundColor ? "transparent" : el.backgroundColor,
    fillStyle: mapFillStyle(el.fillStyle),
    strokeStyle: mapStrokeStyle(el.strokeStyle),
    strokeWidth: el.strokeWidth ?? 2,
    roughness: el.roughness ?? 1,
    opacity: el.opacity != null ? (el.opacity > 1 ? el.opacity / 100 : el.opacity) : 1,
    rotation: el.angle ?? 0,
    seed: generateSeed(),
    groupId: el.groupIds && el.groupIds.length > 0 ? "grp-" + generateId() : undefined,
  };

  switch (el.type) {
    case "rectangle":
      return { ...base, type: "rectangle" as const };

    case "diamond":
      return { ...base, type: "diamond" as const };

    case "ellipse":
      return { ...base, type: "ellipse" as const };

    case "line":
      return {
        ...base,
        type: "line" as const,
        points: (el.points || [[0, 0], [el.width || 0, el.height || 0]]) as [number, number][],
        endArrowhead: "none" as const,
        startArrowhead: "none" as const,
      };

    case "arrow":
      return {
        ...base,
        type: "arrow" as const,
        points: (el.points || [[0, 0], [el.width || 0, el.height || 0]]) as [number, number][],
        endArrowhead: mapArrowhead(el.endArrowhead),
        startArrowhead: mapArrowhead(el.startArrowhead),
      };

    case "freedraw":
    case "draw":
      return {
        ...base,
        type: "freehand" as const,
        points: (el.points || []) as [number, number][],
      };

    case "text":
      return {
        ...base,
        type: "text" as const,
        text: el.text || "",
        fontSize: el.fontSize ?? 20,
        fontFamily: mapFontFamily(el.fontFamily),
      };

    default:
      return null;
  }
}

export function isFilePath(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("\\\\") ||
    trimmed.startsWith("//") ||
    /^[a-zA-Z]:[\\/]/.test(trimmed)
  );
}

export function parseLibraryFile(json: string): LibraryFile | null {
  if (isFilePath(json)) {
    return null;
  }
  try {
    const data = JSON.parse(json);
    if (data.type !== "excalidrawlib") {
      return null;
    }

    // v2 format: { libraryItems: [{ id, name, elements, ... }, ...] }
    if (Array.isArray(data.libraryItems)) {
      return data as LibraryFile;
    }

    // v1 format: { library: [ [element, ...], [element, ...], ... ] }
    if (Array.isArray(data.library)) {
      const libraryItems = data.library.map((group: any[], index: number) => ({
        id: generateId(),
        name: `Item ${index + 1}`,
        elements: Array.isArray(group) ? group : [],
        created: Date.now(),
        status: "published" as const,
      }));
      return { type: "excalidrawlib", version: 2, libraryItems };
    }

    return null;
  } catch {
    return null;
  }
}

export function convertLibraryItems(items: LibraryFile["libraryItems"]): LibraryItem[] {
  return items.map((item) => {
    const rawElements = (item.elements as unknown as ExcalidrawLibElement[]) || [];
    const elements: DrawElement[] = rawElements
      .map(convertExcalidrawElement)
      .filter((el): el is DrawElement => el !== null);

    return {
      id: item.id || generateId(),
      name: item.name || "Unnamed",
      elements,
      created: item.created || Date.now(),
      status: item.status || "published",
    };
  }).filter((item) => item.elements.length > 0);
}

export function renderThumbnail(elements: DrawElement[], size: number = 100): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  if (elements.length === 0) return "";

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const ex = el.x + el.width;
    const ey = el.y + el.height;
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    if (ex > maxX) maxX = ex;
    if (ey > maxY) maxY = ey;
  }

  const padding = 10;
  const contentW = maxX - minX || 1;
  const contentH = maxY - minY || 1;
  const scale = Math.min((size - padding * 2) / contentW, (size - padding * 2) / contentH);
  const offsetX = (size - contentW * scale) / 2 - minX * scale;
  const offsetY = (size - contentH * scale) / 2 - minY * scale;

  ctx.clearRect(0, 0, size, size);

  for (const el of elements) {
    ctx.save();
    ctx.translate(offsetX + el.x * scale, offsetY + el.y * scale);
    ctx.scale(scale, scale);

    const isTransparent = el.fillColor === "transparent";
    ctx.fillStyle = isTransparent ? "rgba(0,0,0,0)" : el.fillColor;
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = el.strokeWidth;
    ctx.globalAlpha = el.opacity;

    if (el.strokeStyle === "dashed") {
      ctx.setLineDash([8, 4]);
    } else if (el.strokeStyle === "dotted") {
      ctx.setLineDash([2, 4]);
    } else {
      ctx.setLineDash([]);
    }

    switch (el.type) {
      case "rectangle":
        ctx.beginPath();
        ctx.rect(0, 0, el.width, el.height);
        if (!isTransparent) ctx.fill();
        ctx.stroke();
        break;

      case "rounded-rectangle": {
        const r = Math.min(el.borderRadius || 8, el.width / 2, el.height / 2);
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(el.width - r, 0);
        ctx.quadraticCurveTo(el.width, 0, el.width, r);
        ctx.lineTo(el.width, el.height - r);
        ctx.quadraticCurveTo(el.width, el.height, el.width - r, el.height);
        ctx.lineTo(r, el.height);
        ctx.quadraticCurveTo(0, el.height, 0, el.height - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        if (!isTransparent) ctx.fill();
        ctx.stroke();
        break;
      }

      case "ellipse": {
        const cx = el.width / 2;
        const cy = el.height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(el.width) / 2, Math.abs(el.height) / 2, 0, 0, Math.PI * 2);
        if (!isTransparent) ctx.fill();
        ctx.stroke();
        break;
      }

      case "diamond": {
        const cx = el.width / 2;
        const cy = el.height / 2;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(el.width, cy);
        ctx.lineTo(cx, el.height);
        ctx.lineTo(0, cy);
        ctx.closePath();
        if (!isTransparent) ctx.fill();
        ctx.stroke();
        break;
      }

      case "star": {
        const cx = el.width / 2;
        const cy = el.height / 2;
        const outerR = Math.min(el.width, el.height) / 2;
        const innerR = outerR * 0.4;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
          else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        }
        ctx.closePath();
        if (!isTransparent) ctx.fill();
        ctx.stroke();
        break;
      }

      case "hexagon": {
        const cx = el.width / 2;
        const cy = el.height / 2;
        const r = Math.min(el.width, el.height) / 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
          else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        }
        ctx.closePath();
        if (!isTransparent) ctx.fill();
        ctx.stroke();
        break;
      }

      case "line":
      case "arrow": {
        if ("points" in el && el.points.length >= 2) {
          const start = el.points[0];
          const end = el.points[el.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(start[0], start[1]);
          ctx.lineTo(end[0], end[1]);
          ctx.stroke();

          if (el.type === "arrow" && "endArrowhead" in el) {
            const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
            drawArrowhead(ctx, end, angle, el.endArrowhead, el.strokeColor, el.strokeWidth);
          }
        }
        break;
      }

      case "freehand": {
        if ("points" in el && el.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(el.points[0][0], el.points[0][1]);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i][0], el.points[i][1]);
          }
          ctx.stroke();
        }
        break;
      }

      case "text": {
        if ("text" in el) {
          ctx.fillStyle = el.strokeColor;
          ctx.font = `${el.fontSize || 16}px ${el.fontFamily || "sans-serif"}`;
          ctx.fillText(el.text, 0, el.fontSize || 16);
        }
        break;
      }

      case "note": {
        const foldSize = Math.min(15, el.width / 3, el.height / 3);
        ctx.fillStyle = el.fillColor === "transparent" ? "#fff59d" : el.fillColor;
        ctx.fillRect(0, 0, el.width, el.height);
        ctx.strokeRect(0, 0, el.width, el.height);
        ctx.beginPath();
        ctx.moveTo(el.width - foldSize, el.height);
        ctx.lineTo(el.width, el.height - foldSize);
        ctx.lineTo(el.width - foldSize, el.height - foldSize);
        ctx.closePath();
        ctx.fillStyle = "#e0e0e0";
        ctx.fill();
        break;
      }

      case "callout": {
        ctx.fillStyle = el.fillColor === "transparent" ? "#ffffff" : el.fillColor;
        ctx.beginPath();
        ctx.roundRect(0, 0, el.width, el.height, 8);
        if (!isTransparent) ctx.fill();
        ctx.stroke();
        const tailX = el.width / 2;
        ctx.beginPath();
        ctx.moveTo(tailX - 10, el.height);
        ctx.lineTo(tailX, el.height + 15);
        ctx.lineTo(tailX + 10, el.height);
        if (!isTransparent) ctx.fill();
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  return canvas.toDataURL();
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  point: [number, number],
  angle: number,
  style: string,
  color: string,
  strokeWidth: number
) {
  if (style === "none") return;
  const [x, y] = point;
  const len = 10 + strokeWidth;
  const spread = Math.PI / 6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;

  if (style === "arrow") {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * Math.cos(angle - spread), y - len * Math.sin(angle - spread));
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * Math.cos(angle + spread), y - len * Math.sin(angle + spread));
    ctx.stroke();
  } else if (style === "triangle") {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * Math.cos(angle - spread), y - len * Math.sin(angle - spread));
    ctx.lineTo(x - len * Math.cos(angle + spread), y - len * Math.sin(angle + spread));
    ctx.closePath();
    ctx.fill();
  } else if (style === "circle") {
    const r = len * 0.3;
    ctx.beginPath();
    ctx.arc(x - len * Math.cos(angle), y - len * Math.sin(angle), r, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "diamond") {
    const cx = x - len * 0.5 * Math.cos(angle);
    const cy = y - len * 0.5 * Math.sin(angle);
    const r = len * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(cx + r * Math.cos(angle + Math.PI / 2), cy + r * Math.sin(angle + Math.PI / 2));
    ctx.lineTo(cx - len * 0.5 * Math.cos(angle), cy - len * 0.5 * Math.sin(angle));
    ctx.lineTo(cx - r * Math.cos(angle + Math.PI / 2), cy - r * Math.sin(angle + Math.PI / 2));
    ctx.closePath();
    ctx.fill();
  } else if (style === "bar") {
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const half = len * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + perpX * half, y + perpY * half);
    ctx.lineTo(x - perpX * half, y - perpY * half);
    ctx.stroke();
  }

  ctx.restore();
}

export function persistLibrary(items: LibraryItem[]): void {
  try {
    const data: LibraryFile = {
      type: "excalidrawlib",
      version: 2,
      libraryItems: items,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadPersistedLibrary(): LibraryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.type === "excalidrawlib" && Array.isArray(data.libraryItems)) {
      return data.libraryItems as LibraryItem[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchRemoteLibraries(): Promise<RemoteLibrary[]> {
  try {
    const response = await fetch(REMOTE_LIBRARIES_URL);
    if (!response.ok) throw new Error("Failed to fetch libraries");
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map((lib: any) => ({
        name: lib.name || "Unnamed",
        authors: Array.isArray(lib.authors) ? lib.authors : [],
        source: lib.source || "",
        preview: lib.preview,
        total: lib.total || 0,
        created: lib.created || 0,
        updated: lib.updated || 0,
        description: lib.description,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchRemoteLibraryItems(sourceUrl: string): Promise<LibraryItem[]> {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error("Failed to fetch library");
    const text = await response.text();
    const libFile = parseLibraryFile(text);
    if (!libFile) return [];
    return convertLibraryItems(libFile.libraryItems);
  } catch {
    return [];
  }
}

export function createExportLibraryData(items: LibraryItem[]): string {
  const data: LibraryFile = {
    type: "excalidrawlib",
    version: 2,
    libraryItems: items,
  };
  return JSON.stringify(data, null, 2);
}
