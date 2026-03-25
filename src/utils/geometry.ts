import type { DrawElement, LineElement, FreehandElement, TextElement } from "../types";

export function getElementBounds(el: DrawElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (el.type === "line" || el.type === "arrow") {
    const lineEl = el as LineElement;
    if (lineEl.points.length < 2) {
      return { x: el.x, y: el.y, width: 0, height: 0 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of lineEl.points) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return {
      x: el.x + minX,
      y: el.y + minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  if (el.type === "freehand") {
    const fhEl = el as FreehandElement;
    if (fhEl.points.length === 0) {
      return { x: el.x, y: el.y, width: 0, height: 0 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of fhEl.points) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    const padding = el.strokeWidth / 2;
    return {
      x: el.x + minX - padding,
      y: el.y + minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }

  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
  };
}

export function pointInElement(
  px: number,
  py: number,
  el: DrawElement,
  threshold = 5
): boolean {
  const bounds = getElementBounds(el);

  if (el.type === "line" || el.type === "arrow") {
    const lineEl = el as LineElement;
    for (let i = 0; i < lineEl.points.length - 1; i++) {
      const [x1, y1] = lineEl.points[i];
      const [x2, y2] = lineEl.points[i + 1];
      const dist = distToSegment(
        px - el.x,
        py - el.y,
        x1,
        y1,
        x2,
        y2
      );
      if (dist < threshold + el.strokeWidth) return true;
    }
    return false;
  }

  if (el.type === "freehand") {
    const fhEl = el as FreehandElement;
    for (const [fx, fy] of fhEl.points) {
      const dx = px - (el.x + fx);
      const dy = py - (el.y + fy);
      if (Math.sqrt(dx * dx + dy * dy) < threshold + el.strokeWidth) {
        return true;
      }
    }
    return false;
  }

  if (el.type === "text") {
    return (
      px >= bounds.x - 4 &&
      px <= bounds.x + bounds.width + 4 &&
      py >= bounds.y - 4 &&
      py <= bounds.y + bounds.height + 4
    );
  }

  const padding = el.strokeWidth + 2;
  return (
    px >= bounds.x - padding &&
    px <= bounds.x + bounds.width + padding &&
    py >= bounds.y - padding &&
    py <= bounds.y + bounds.height + padding
  );
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;
  return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
}

export function getResizeHandle(
  px: number,
  py: number,
  el: DrawElement,
  zoom: number = 1
): string | null {
  const bounds = getElementBounds(el);
  const hs = 8 / zoom;

  const handles: Record<string, [number, number]> = {
    nw: [bounds.x, bounds.y],
    ne: [bounds.x + bounds.width, bounds.y],
    sw: [bounds.x, bounds.y + bounds.height],
    se: [bounds.x + bounds.width, bounds.y + bounds.height],
    n: [bounds.x + bounds.width / 2, bounds.y],
    s: [bounds.x + bounds.width / 2, bounds.y + bounds.height],
    w: [bounds.x, bounds.y + bounds.height / 2],
    e: [bounds.x + bounds.width, bounds.y + bounds.height / 2],
  };

  for (const [name, [hx, hy]] of Object.entries(handles)) {
    if (Math.abs(px - hx) < hs && Math.abs(py - hy) < hs) {
      return name;
    }
  }
  return null;
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewTransform: { x: number; y: number; zoom: number },
  canvasRect: DOMRect
): { x: number; y: number } {
  return {
    x: (screenX - canvasRect.left - viewTransform.x) / viewTransform.zoom,
    y: (screenY - canvasRect.top - viewTransform.y) / viewTransform.zoom,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewTransform: { x: number; y: number; zoom: number },
  canvasRect: DOMRect
): { x: number; y: number } {
  return {
    x: canvasX * viewTransform.zoom + viewTransform.x + canvasRect.left,
    y: canvasY * viewTransform.zoom + viewTransform.y + canvasRect.top,
  };
}

export function measureText(text: string, fontSize: number): { width: number; height: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${fontSize}px sans-serif`;
  const lines = text.split("\n");
  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    maxWidth = Math.max(maxWidth, metrics.width);
  }
  return {
    width: maxWidth,
    height: lines.length * fontSize * 1.3,
  };
}

export function getNoteCloneHandle(
  px: number,
  py: number,
  el: DrawElement,
  zoom: number = 1
): "right" | "bottom" | null {
  if (el.type !== "note") return null;
  const bounds = getElementBounds(el);
  const radius = 8 / zoom;

  // Right handle at (x + width, y + height/2)
  const rx = bounds.x + bounds.width;
  const ry = bounds.y + bounds.height / 2;
  if (Math.sqrt((px - rx) ** 2 + (py - ry) ** 2) < radius) return "right";

  // Bottom handle at (x + width/2, y + height)
  const bx = bounds.x + bounds.width / 2;
  const by = bounds.y + bounds.height;
  if (Math.sqrt((px - bx) ** 2 + (py - by) ** 2) < radius) return "bottom";

  return null;
}
