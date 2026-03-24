import rough from "roughjs";
import { getStroke } from "perfect-freehand";
import type { DrawElement, ShapeElement, LineElement, FreehandElement, TextElement, MermaidElement } from "../types";
import { getElementBounds } from "./geometry";

const CULL_PADDING = 50;

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
  viewTransform: { x: number; y: number; zoom: number }
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

  drawGrid(ctx, viewTransform, screenW, screenH);

  const viewport = getViewportBounds(viewTransform, screenW, screenH);
  const rc = rough.canvas(canvas);

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
    } else if (el.type === "mermaid") {
      renderMermaid(ctx, rc, el as MermaidElement);
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
  height: number
): void {
  const gridSize = 20;
  const startX = Math.floor(-viewTransform.x / viewTransform.zoom / gridSize) * gridSize;
  const startY = Math.floor(-viewTransform.y / viewTransform.zoom / gridSize) * gridSize;
  const endX = startX + width / viewTransform.zoom + gridSize * 2;
  const endY = startY + height / viewTransform.zoom + gridSize * 2;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
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

  const stroke = getStroke(absPoints, {
    size: el.strokeWidth * 2,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
  });

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

  ctx.restore();
}
