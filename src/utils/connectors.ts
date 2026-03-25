import type { DrawElement, LineElement, C4RelationshipElement } from "../types";
import { getElementBounds } from "./geometry";

export type AnchorSide = "top" | "right" | "bottom" | "left" | "center";

export interface AnchorPoint {
  x: number;
  y: number;
  side: AnchorSide;
}

export interface AnchorHit {
  elementId: string;
  anchor: AnchorSide;
  x: number;
  y: number;
}

export function getAnchorPoints(el: DrawElement): AnchorPoint[] {
  const b = getElementBounds(el);
  return [
    { x: b.x + b.width / 2, y: b.y, side: "top" },
    { x: b.x + b.width, y: b.y + b.height / 2, side: "right" },
    { x: b.x + b.width / 2, y: b.y + b.height, side: "bottom" },
    { x: b.x, y: b.y + b.height / 2, side: "left" },
    { x: b.x + b.width / 2, y: b.y + b.height / 2, side: "center" },
  ];
}

export function getAnchorPosition(el: DrawElement, anchor: AnchorSide): { x: number; y: number } {
  const b = getElementBounds(el);
  switch (anchor) {
    case "top": return { x: b.x + b.width / 2, y: b.y };
    case "right": return { x: b.x + b.width, y: b.y + b.height / 2 };
    case "bottom": return { x: b.x + b.width / 2, y: b.y + b.height };
    case "left": return { x: b.x, y: b.y + b.height / 2 };
    case "center": return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
}

export function findAnchorAtPoint(
  px: number,
  py: number,
  elements: DrawElement[],
  excludeId: string | null,
  zoom: number
): AnchorHit | null {
  const threshold = 12 / zoom;
  let closest: AnchorHit | null = null;
  let closestDist = threshold;

  for (const el of elements) {
    if (el.id === excludeId) continue;
    if (el.type === "line" || el.type === "arrow" || el.type === "c4-relationship" || el.type === "freehand" || el.type === "callout") continue;

    const anchors = getAnchorPoints(el);
    for (const a of anchors) {
      const dx = px - a.x;
      const dy = py - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = { elementId: el.id, anchor: a.side, x: a.x, y: a.y };
      }
    }
  }

  return closest;
}

export function findElementAtPoint(
  px: number,
  py: number,
  elements: DrawElement[],
  excludeIds: Set<string>
): DrawElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (excludeIds.has(el.id)) continue;
    if (el.type === "line" || el.type === "arrow" || el.type === "c4-relationship" || el.type === "freehand" || el.type === "callout") continue;
    const b = getElementBounds(el);
    const padding = 5;
    if (
      px >= b.x - padding &&
      px <= b.x + b.width + padding &&
      py >= b.y - padding &&
      py <= b.y + b.height + padding
    ) {
      return el;
    }
  }
  return null;
}

export function getBestAnchor(
  px: number,
  py: number,
  el: DrawElement
): AnchorSide {
  const anchors = getAnchorPoints(el);
  let best: AnchorSide = "center";
  let bestDist = Infinity;
  for (const a of anchors) {
    const dx = px - a.x;
    const dy = py - a.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = a.side;
    }
  }
  return best;
}

export function updateConnectorPoints(
  connector: LineElement | C4RelationshipElement,
  elements: DrawElement[]
): Partial<LineElement> | null {
  const hasStart = connector.startElementId;
  const hasEnd = connector.endElementId;
  if (!hasStart && !hasEnd) return null;

  const updates: Partial<LineElement> = {};

  if (hasStart) {
    const startEl = elements.find((e) => e.id === connector.startElementId);
    if (startEl) {
      const anchor = connector.startAnchor || "center";
      const pos = getAnchorPosition(startEl, anchor);
      // Update first point: points[0] is always [0,0] relative, so set x,y to absolute
      const points = [...connector.points] as [number, number][];
      if (points.length >= 2) {
        const endAbsX = connector.x + points[points.length - 1][0];
        const endAbsY = connector.y + points[points.length - 1][1];
        updates.x = pos.x;
        updates.y = pos.y;
        // Recalculate relative points
        updates.points = points.map(([px, py], i) => {
          if (i === 0) return [0, 0] as [number, number];
          // For last point, if end is also connected, it will be updated below
          return [px, py] as [number, number];
        });
      }
    }
  }

  if (hasEnd) {
    const endEl = elements.find((e) => e.id === connector.endElementId);
    if (endEl) {
      const anchor = connector.endAnchor || "center";
      const pos = getAnchorPosition(endEl, anchor);
      const baseX = updates.x ?? connector.x;
      const baseY = updates.y ?? connector.y;
      const points = [...(updates.points ?? connector.points)] as [number, number][];
      if (points.length >= 2) {
        points[points.length - 1] = [pos.x - baseX, pos.y - baseY];
        updates.points = points;
      }
    }
  }

  return Object.keys(updates).length > 0 ? updates : null;
}
