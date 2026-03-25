import rough from "roughjs";
import { getStroke } from "perfect-freehand";
import type { DrawElement, ShapeElement, LineElement, FreehandElement, TextElement, NoteElement, MermaidElement, C4Element, C4RelationshipElement } from "../types";
import { getElementBounds } from "./geometry";
import { NOTE_FOLD_SIZE, C4_FONT_SIZE, C4_DESC_FONT_SIZE, C4_TECH_FONT_SIZE } from "./constants";

const CULL_PADDING = 50;

const freehandStrokeCache = new Map<string, { pointsLen: number; strokeWidth: number; output: [number, number][] }>();

export function clearFreehandStrokeCache(elementId?: string): void {
  if (elementId) {
    freehandStrokeCache.delete(elementId);
  } else {
    freehandStrokeCache.clear();
  }
}

export function getViewportBounds(
  viewTransform: { x: number; y: number; zoom: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: -viewTransform.x / viewTransform.zoom - CULL_PADDING,
    y: -viewTransform.y / viewTransform.zoom - CULL_PADDING,
    width: canvasWidth / viewTransform.zoom + CULL_PADDING * 2,
    height: canvasHeight / viewTransform.zoom + CULL_PADDING * 2,
  };
}

function boundsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function renderElements(
  ctx: CanvasRenderingContext2D,
  elements: DrawElement[],
  selectedIds: string[],
  viewTransform: { x: number; y: number; zoom: number },
  showGrid: boolean = true,
  theme: "dark" | "light" = "dark"
): void {
  const dpr = window.devicePixelRatio || 1;
  const canvas = ctx.canvas;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(viewTransform.x, viewTransform.y);
  ctx.scale(viewTransform.zoom, viewTransform.zoom);

  const screenW = canvas.width / dpr;
  const screenH = canvas.height / dpr;

  if (showGrid) {
    drawGrid(ctx, viewTransform, screenW, screenH, theme);
  }

  const viewport = getViewportBounds(viewTransform, screenW, screenH);
  const rc = rough.canvas(canvas);

  // Clean stale freehand stroke cache entries
  if (freehandStrokeCache.size > 0) {
    const currentFreehandIds = new Set<string>();
    for (const el of elements) {
      if (el.type === "freehand") currentFreehandIds.add(el.id);
    }
    for (const id of freehandStrokeCache.keys()) {
      if (!currentFreehandIds.has(id)) freehandStrokeCache.delete(id);
    }
  }

  for (const el of elements) {
    const bounds = getElementBounds(el);
    if (!boundsIntersect(bounds, viewport)) continue;

    ctx.save();
    ctx.globalAlpha = el.opacity;

    if (el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond") {
      renderShape(ctx, rc, el as ShapeElement);
    } else if (el.type === "line" || el.type === "arrow") {
      renderLine(ctx, rc, el as LineElement);
    } else if (el.type === "freehand") {
      renderFreehand(ctx, el as FreehandElement);
    } else if (el.type === "text") {
      renderText(ctx, el as TextElement);
    } else if (el.type === "note") {
      renderNote(ctx, rc, el as NoteElement);
    } else if (el.type === "mermaid") {
      renderMermaid(ctx, rc, el as MermaidElement);
    } else if (el.type.startsWith("c4-") && el.type !== "c4-relationship") {
      renderC4Element(ctx, rc, el as C4Element);
    } else if (el.type === "c4-relationship") {
      renderC4Relationship(ctx, rc, el as C4RelationshipElement);
    }

    ctx.restore();
  }

  for (const id of selectedIds) {
    const el = elements.find((e) => e.id === id);
    if (el) drawSelectionHandles(ctx, el, viewTransform.zoom);
  }

  ctx.restore();
}

export function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  viewTransform: { x: number; y: number; zoom: number }
): void {
  ctx.save();
  ctx.strokeStyle = "#0078d4";
  ctx.lineWidth = 1 / viewTransform.zoom;
  ctx.setLineDash([4 / viewTransform.zoom, 4 / viewTransform.zoom]);
  ctx.fillStyle = "rgba(0, 120, 212, 0.08)";
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewTransform: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  theme: "dark" | "light" = "dark"
): void {
  const gridSize = 20;
  const startX = Math.floor(-viewTransform.x / viewTransform.zoom / gridSize) * gridSize;
  const startY = Math.floor(-viewTransform.y / viewTransform.zoom / gridSize) * gridSize;
  const endX = startX + width / viewTransform.zoom + gridSize * 2;
  const endY = startY + height / viewTransform.zoom + gridSize * 2;

  ctx.save();
  ctx.strokeStyle = theme === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1 / viewTransform.zoom;
  ctx.beginPath();

  for (let x = startX; x < endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y < endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
  ctx.restore();
}

function renderShape(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: ShapeElement
): void {
  const options = {
    seed: el.seed,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    roughness: el.roughness,
    fill: el.fillColor === "transparent" ? undefined : el.fillColor,
    fillStyle: el.fillStyle === "none" ? undefined : el.fillStyle,
    strokeStyle: el.strokeStyle === "solid" ? undefined : el.strokeStyle,
    bowing: el.roughness * 0.5,
  };

  if (el.type === "rectangle") {
    rc.rectangle(el.x, el.y, el.width, el.height, options);
  } else if (el.type === "ellipse") {
    rc.ellipse(
      el.x + el.width / 2,
      el.y + el.height / 2,
      Math.abs(el.width),
      Math.abs(el.height),
      options
    );
  } else if (el.type === "diamond") {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const hw = Math.abs(el.width) / 2;
    const hh = Math.abs(el.height) / 2;
    rc.polygon(
      [
        [cx, cy - hh],
        [cx + hw, cy],
        [cx, cy + hh],
        [cx - hw, cy],
      ],
      options
    );
  }
}

function renderLine(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: LineElement
): void {
  if (el.points.length < 2) return;

  const absPoints = el.points.map(([px, py]) => [el.x + px, el.y + py] as [number, number]);

  const options = {
    seed: el.seed,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    roughness: el.roughness,
  };

  if (el.type === "line") {
    rc.line(absPoints[0][0], absPoints[0][1], absPoints[absPoints.length - 1][0], absPoints[absPoints.length - 1][1], options);
  } else if (el.type === "arrow") {
    const start = absPoints[0];
    const end = absPoints[absPoints.length - 1];

    rc.line(start[0], start[1], end[0], end[1], options);

    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
    const arrowLen = 12 + el.strokeWidth * 2;
    const arrowAngle = Math.PI / 6;

    if (el.endArrowhead !== false) {
      const a1x = end[0] - arrowLen * Math.cos(angle - arrowAngle);
      const a1y = end[1] - arrowLen * Math.sin(angle - arrowAngle);
      const a2x = end[0] - arrowLen * Math.cos(angle + arrowAngle);
      const a2y = end[1] - arrowLen * Math.sin(angle + arrowAngle);

      rc.line(end[0], end[1], a1x, a1y, options);
      rc.line(end[0], end[1], a2x, a2y, options);
    }

    if (el.startArrowhead) {
      const a1x = start[0] + arrowLen * Math.cos(angle - arrowAngle);
      const a1y = start[1] + arrowLen * Math.sin(angle - arrowAngle);
      const a2x = start[0] + arrowLen * Math.cos(angle + arrowAngle);
      const a2y = start[1] + arrowLen * Math.sin(angle + arrowAngle);

      rc.line(start[0], start[1], a1x, a1y, options);
      rc.line(start[0], start[1], a2x, a2y, options);
    }
  }
}

function renderFreehand(ctx: CanvasRenderingContext2D, el: FreehandElement): void {
  if (el.points.length < 2) return;

  const absPoints = el.points.map(([px, py]) => [el.x + px, el.y + py]);

  const cached = freehandStrokeCache.get(el.id);
  let stroke: [number, number][];
  if (cached && cached.pointsLen === el.points.length && cached.strokeWidth === el.strokeWidth) {
    stroke = cached.output;
  } else {
    stroke = getStroke(absPoints, {
      size: el.strokeWidth * 2,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    }) as [number, number][];
    freehandStrokeCache.set(el.id, { pointsLen: el.points.length, strokeWidth: el.strokeWidth, output: stroke });
  }

  if (stroke.length < 2) return;

  ctx.save();
  ctx.fillStyle = el.strokeColor;
  ctx.beginPath();
  ctx.moveTo(stroke[0][0], stroke[0][1]);
  for (let i = 1; i < stroke.length; i++) {
    ctx.lineTo(stroke[i][0], stroke[i][1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderText(ctx: CanvasRenderingContext2D, el: TextElement): void {
  ctx.save();
  ctx.fillStyle = el.strokeColor;
  ctx.font = `${el.fontSize}px ${el.fontFamily}`;
  ctx.textBaseline = "top";

  const lines = el.text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], el.x, el.y + i * el.fontSize * 1.3);
  }
  ctx.restore();
}

function renderNote(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: NoteElement
): void {
  const foldSize = Math.min(NOTE_FOLD_SIZE, el.width / 3, el.height / 3);

  const options = {
    seed: el.seed,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    roughness: el.roughness,
    fill: el.fillColor === "transparent" ? undefined : el.fillColor,
    fillStyle: "solid" as const,
    strokeStyle: el.strokeStyle === "solid" ? undefined : el.strokeStyle,
    bowing: el.roughness * 0.3,
  };

  // Draw the main rectangle (full size) with solid fill
  rc.rectangle(el.x, el.y, el.width, el.height, options);

  // Draw the corner fold triangle
  const foldX = el.x + el.width - foldSize;
  const foldY = el.y + el.height - foldSize;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(el.x + el.width - foldSize, el.y + el.height);
  ctx.lineTo(el.x + el.width, el.y + el.height - foldSize);
  ctx.lineTo(el.x + el.width - foldSize, el.y + el.height - foldSize);
  ctx.closePath();

  // Fill the fold with a slightly darker shade
  ctx.fillStyle = el.fillColor === "transparent" ? "#e0e0e0" : darkenColor(el.fillColor, 0.15);
  ctx.fill();
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();

  // Draw text content
  if (el.text) {
    ctx.save();
    ctx.fillStyle = el.strokeColor;
    ctx.font = `${el.fontSize}px ${el.fontFamily}`;
    ctx.textBaseline = "top";

    const paddingX = 12;
    const paddingY = 8;
    const lines = el.text.split("\n");
    const lineHeight = el.fontSize * 1.3;

    for (let i = 0; i < lines.length; i++) {
      const textY = el.y + paddingY + i * lineHeight;
      if (textY + lineHeight > el.y + el.height - paddingY) break;
      ctx.fillText(lines[i], el.x + paddingX, textY, el.width - paddingX * 2);
    }
    ctx.restore();
  }
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function renderMermaid(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: MermaidElement
): void {
  const origW = el.originalWidth || el.width;
  const origH = el.originalHeight || el.height;
  const sx = origW > 0 ? el.width / origW : 1;
  const sy = origH > 0 ? el.height / origH : 1;

  const options = {
    seed: el.seed,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    roughness: el.roughness,
    fill: el.fillColor === "transparent" ? undefined : el.fillColor,
    fillStyle: el.fillStyle === "none" ? undefined : el.fillStyle as any,
    bowing: el.roughness * 0.5,
  };

  for (const edge of el.renderedEdges) {
    if (edge.points.length < 2) continue;

    const absPoints = edge.points.map(([px, py]) => [
      el.x + px * sx,
      el.y + py * sy,
    ] as [number, number]);

    for (let i = 0; i < absPoints.length - 1; i++) {
      rc.line(absPoints[i][0], absPoints[i][1], absPoints[i + 1][0], absPoints[i + 1][1], {
        seed: el.seed + i,
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth,
        roughness: el.roughness,
      });
    }

    if (edge.label) {
      const midIdx = Math.floor(absPoints.length / 2);
      const [mx, my] = absPoints[midIdx];
      ctx.save();
      ctx.fillStyle = el.strokeColor;
      ctx.font = `${Math.max(8, 12 * Math.min(sx, sy))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(edge.label, mx, my - 8 * Math.min(sx, sy));
      ctx.restore();
    }
  }

  for (const node of el.renderedNodes) {
    const nx = el.x + node.x * sx;
    const ny = el.y + node.y * sy;
    const nw = node.width * sx;
    const nh = node.height * sy;

    if (node.shape === "diamond") {
      const cx = nx + nw / 2;
      const cy = ny + nh / 2;
      const hw = nw / 2;
      const hh = nh / 2;
      rc.polygon(
        [
          [cx, cy - hh],
          [cx + hw, cy],
          [cx, cy + hh],
          [cx - hw, cy],
        ],
        options
      );
    } else if (node.shape === "circle") {
      rc.ellipse(
        nx + nw / 2,
        ny + nh / 2,
        nw,
        nh,
        options
      );
    } else if (node.shape === "state-start") {
      const cx = nx + nw / 2;
      const cy = ny + nh / 2;
      const r = Math.min(nw, nh) / 2;
      ctx.save();
      ctx.fillStyle = el.strokeColor;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (node.shape === "state-end") {
      const cx = nx + nw / 2;
      const cy = ny + nh / 2;
      const outerR = Math.min(nw, nh) / 2;
      const innerR = outerR * 0.55;
      ctx.save();
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.fillStyle = el.strokeColor;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      rc.rectangle(nx, ny, nw, nh, {
        ...options,
        seed: el.seed + node.x + node.y,
      });
    }

    if (node.label) {
      ctx.save();
      ctx.fillStyle = el.strokeColor;
      const fontSize = Math.max(8, 14 * Math.min(sx, sy));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const lines = node.label.split("\n");
      const lineHeight = fontSize * 1.15;
      const totalHeight = lines.length * lineHeight;
      const startY = ny + nh / 2 - totalHeight / 2 + lineHeight / 2;

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], nx + nw / 2, startY + i * lineHeight);
      }
      ctx.restore();
    }
  }
}

function renderC4Element(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: C4Element
): void {
  const { x, y, width, height, c4Type } = el;

  if (c4Type === "c4-person") {
    renderC4Person(ctx, rc, el);
  } else if (c4Type === "c4-database") {
    renderC4Database(ctx, rc, el);
  } else if (c4Type === "c4-system-boundary" || c4Type === "c4-enterprise-boundary") {
    renderC4Boundary(ctx, rc, el);
  } else {
    renderC4Box(ctx, rc, el);
  }
}

function renderC4Box(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: C4Element
): void {
  const radius = 8;
  const options = {
    seed: el.seed,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    roughness: el.roughness,
    fill: el.fillColor === "transparent" ? undefined : el.fillColor,
    fillStyle: "solid" as const,
    bowing: el.roughness * 0.3,
  };

  // Draw rounded rectangle
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(el.x, el.y, el.width, el.height, radius);
  ctx.fillStyle = el.fillColor;
  ctx.fill();
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();

  // Draw rough.js overlay for sketch effect
  rc.rectangle(el.x, el.y, el.width, el.height, {
    ...options,
    fill: undefined,
    fillStyle: undefined,
  });

  renderC4Labels(ctx, el);
}

function renderC4Person(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: C4Element
): void {
  const cx = el.x + el.width / 2;
  const headRadius = Math.min(el.width, el.height) * 0.15;

  // Draw head (circle)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, el.y + headRadius + 4, headRadius, 0, Math.PI * 2);
  ctx.fillStyle = el.fillColor;
  ctx.fill();
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();

  // Draw body line
  const bodyTop = el.y + headRadius * 2 + 4;
  const bodyBottom = el.y + el.height * 0.6;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, bodyTop);
  ctx.lineTo(cx, bodyBottom);
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();

  // Draw legs
  const legY = bodyBottom;
  const legEndY = el.y + el.height - 4;
  const legSpread = el.width * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, legY);
  ctx.lineTo(cx - legSpread, legEndY);
  ctx.moveTo(cx, legY);
  ctx.lineTo(cx + legSpread, legEndY);
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();

  // Draw arms
  const armY = bodyTop + (bodyBottom - bodyTop) * 0.3;
  const armSpread = el.width * 0.3;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, armY);
  ctx.lineTo(cx - armSpread, armY + el.height * 0.15);
  ctx.moveTo(cx, armY);
  ctx.lineTo(cx + armSpread, armY + el.height * 0.15);
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();

  renderC4Labels(ctx, el, true);
}

function renderC4Database(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: C4Element
): void {
  const { x, y, width, height } = el;
  const ry = height * 0.12;

  // Draw cylinder body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + ry);
  ctx.lineTo(x, y + height - ry);
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + width, y + ry);
  ctx.lineTo(x + width, y + height - ry);
  ctx.stroke();

  // Bottom arc
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height - ry, width / 2, ry, 0, 0, Math.PI);
  ctx.fillStyle = el.fillColor;
  ctx.fill();
  ctx.stroke();

  // Body fill
  ctx.beginPath();
  ctx.rect(x, y + ry, width, height - ry * 2);
  ctx.fillStyle = el.fillColor;
  ctx.fill();

  // Top ellipse
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + ry, width / 2, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = el.fillColor;
  ctx.fill();
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();

  renderC4Labels(ctx, el);
}

function renderC4Boundary(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: C4Element
): void {
  ctx.save();
  ctx.setLineDash([8, 4]);
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.strokeRect(el.x, el.y, el.width, el.height);
  ctx.setLineDash([]);
  ctx.restore();

  // Label at top-left
  const label = el.label || (el.c4Type === "c4-enterprise-boundary" ? "Enterprise" : "System");
  ctx.save();
  ctx.fillStyle = el.strokeColor;
  ctx.font = `bold ${C4_FONT_SIZE}px sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(label, el.x + 8, el.y + 6, el.width - 16);
  ctx.restore();
}

function renderC4Labels(ctx: CanvasRenderingContext2D, el: C4Element, isPerson: boolean = false): void {
  const cx = el.x + el.width / 2;
  const lines: { text: string; fontSize: number; bold: boolean }[] = [];

  if (el.label) {
    lines.push({ text: el.label, fontSize: C4_FONT_SIZE, bold: true });
  }
  if (el.description) {
    lines.push({ text: el.description, fontSize: C4_DESC_FONT_SIZE, bold: false });
  }
  if (el.technology) {
    lines.push({ text: `[${el.technology}]`, fontSize: C4_TECH_FONT_SIZE, bold: false });
  }

  if (lines.length === 0) return;

  const totalHeight = lines.reduce((sum, l) => sum + l.fontSize * 1.3, 0);
  let startY: number;
  if (isPerson) {
    startY = el.y + el.height * 0.55;
  } else {
    startY = el.y + el.height / 2 - totalHeight / 2;
  }

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (const line of lines) {
    ctx.fillStyle = (el.c4Type === "c4-system-boundary" || el.c4Type === "c4-enterprise-boundary")
      ? el.strokeColor
      : "#ffffff";
    ctx.font = `${line.bold ? "bold " : ""}${line.fontSize}px sans-serif`;
    ctx.fillText(line.text, cx, startY, el.width - 16);
    startY += line.fontSize * 1.3;
  }
  ctx.restore();
}

function renderC4Relationship(
  ctx: CanvasRenderingContext2D,
  rc: ReturnType<typeof rough.canvas>,
  el: C4RelationshipElement
): void {
  if (el.points.length < 2) return;

  const absPoints = el.points.map(([px, py]) => [el.x + px, el.y + py] as [number, number]);
  const start = absPoints[0];
  const end = absPoints[absPoints.length - 1];

  const options = {
    seed: el.seed,
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    roughness: el.roughness,
  };

  // Dashed line
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);
  ctx.lineTo(end[0], end[1]);
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Arrowhead
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
  const arrowLen = 12 + el.strokeWidth * 2;
  const arrowAngle = Math.PI / 6;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(end[0], end[1]);
  ctx.lineTo(end[0] - arrowLen * Math.cos(angle - arrowAngle), end[1] - arrowLen * Math.sin(angle - arrowAngle));
  ctx.moveTo(end[0], end[1]);
  ctx.lineTo(end[0] - arrowLen * Math.cos(angle + arrowAngle), end[1] - arrowLen * Math.sin(angle + arrowAngle));
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();

  // Label
  if (el.label) {
    const mx = (start[0] + end[0]) / 2;
    const my = (start[1] + end[1]) / 2;
    ctx.save();
    ctx.fillStyle = el.strokeColor;
    ctx.font = `${C4_FONT_SIZE}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(el.label, mx, my - 4, Math.abs(end[0] - start[0]) - 20);
    ctx.restore();
  }
}

function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  el: DrawElement,
  zoom: number
): void {
  const bounds = getElementBounds(el);
  const handleSize = 8 / zoom;

  ctx.save();
  ctx.strokeStyle = "#0078d4";
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.setLineDash([]);

  const handles = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
    [bounds.x + bounds.width / 2, bounds.y],
    [bounds.x + bounds.width / 2, bounds.y + bounds.height],
    [bounds.x, bounds.y + bounds.height / 2],
    [bounds.x + bounds.width, bounds.y + bounds.height / 2],
  ];

  for (const [hx, hy] of handles) {
    ctx.fillStyle = "#0078d4";
    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  }

  // Draw clone handles for note elements (right edge and bottom edge)
  if (el.type === "note") {
    const cloneRadius = 8 / zoom;
    const cloneHandles: [number, number][] = [
      [bounds.x + bounds.width, bounds.y + bounds.height / 2], // right
      [bounds.x + bounds.width / 2, bounds.y + bounds.height], // bottom
    ];

    for (const [cx, cy] of cloneHandles) {
      ctx.beginPath();
      ctx.arc(cx, cy, cloneRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();

      // Draw + sign
      const plusSize = cloneRadius * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - plusSize, cy);
      ctx.lineTo(cx + plusSize, cy);
      ctx.moveTo(cx, cy - plusSize);
      ctx.lineTo(cx, cy + plusSize);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    }
  }

  ctx.restore();
}
