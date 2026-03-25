import { GRID_SIZE, SNAP_THRESHOLD } from "./constants";
import { getElementBounds } from "./geometry";
import type { DrawElement } from "../types";

export interface SnapResult {
  dx: number;
  dy: number;
  guides: GuideLine[];
}

export interface GuideLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getEdges(b: ElementBounds) {
  return {
    left: b.x,
    right: b.x + b.width,
    top: b.y,
    bottom: b.y + b.height,
    centerX: b.x + b.width / 2,
    centerY: b.y + b.height / 2,
  };
}

export function computeSnap(
  movingBounds: ElementBounds,
  allElements: DrawElement[],
  excludeIds: Set<string>,
  zoom: number
): SnapResult {
  const threshold = SNAP_THRESHOLD / zoom;
  const guides: GuideLine[] = [];
  let snapDx = 0;
  let snapDy = 0;

  const moving = getEdges(movingBounds);

  // Grid snap for position
  const gridSnapX = Math.round(movingBounds.x / GRID_SIZE) * GRID_SIZE;
  const gridSnapY = Math.round(movingBounds.y / GRID_SIZE) * GRID_SIZE;
  const gridDx = gridSnapX - movingBounds.x;
  const gridDy = gridSnapY - movingBounds.y;

  // Collect edges from other elements
  const otherLefts: number[] = [];
  const otherRights: number[] = [];
  const otherTops: number[] = [];
  const otherBottoms: number[] = [];
  const otherCenterXs: number[] = [];
  const otherCenterYs: number[] = [];

  for (const el of allElements) {
    if (excludeIds.has(el.id)) continue;
    const b = getElementBounds(el);
    const e = getEdges(b);
    otherLefts.push(e.left);
    otherRights.push(e.right);
    otherTops.push(e.top);
    otherBottoms.push(e.bottom);
    otherCenterXs.push(e.centerX);
    otherCenterYs.push(e.centerY);
  }

  // Snap X axis
  let bestDx = gridDx;
  let bestDxScore = Math.abs(gridDx);
  let snapXGuide: GuideLine | null = null;

  const xChecks: { movingEdge: number; others: number[]; label: "left" | "right" | "centerX" }[] = [
    { movingEdge: moving.left, others: [...otherLefts, ...otherRights, ...otherCenterXs], label: "left" },
    { movingEdge: moving.right, others: [...otherLefts, ...otherRights, ...otherCenterXs], label: "right" },
    { movingEdge: moving.centerX, others: [...otherLefts, ...otherRights, ...otherCenterXs], label: "centerX" },
  ];

  for (const check of xChecks) {
    for (const other of check.others) {
      const d = other - check.movingEdge;
      if (Math.abs(d) < threshold && Math.abs(d) < bestDxScore) {
        bestDx = d;
        bestDxScore = Math.abs(d);
        snapXGuide = { x1: other, y1: Math.min(moving.top, ...otherTops, ...otherBottoms) - 2000, x2: other, y2: Math.max(moving.bottom, ...otherTops, ...otherBottoms) + 2000 };
      }
    }
  }

  // Snap Y axis
  let bestDy = gridDy;
  let bestDyScore = Math.abs(gridDy);
  let snapYGuide: GuideLine | null = null;

  const yChecks: { movingEdge: number; others: number[]; label: "top" | "bottom" | "centerY" }[] = [
    { movingEdge: moving.top, others: [...otherTops, ...otherBottoms, ...otherCenterYs], label: "top" },
    { movingEdge: moving.bottom, others: [...otherTops, ...otherBottoms, ...otherCenterYs], label: "bottom" },
    { movingEdge: moving.centerY, others: [...otherTops, ...otherBottoms, ...otherCenterYs], label: "centerY" },
  ];

  for (const check of yChecks) {
    for (const other of check.others) {
      const d = other - check.movingEdge;
      if (Math.abs(d) < threshold && Math.abs(d) < bestDyScore) {
        bestDy = d;
        bestDyScore = Math.abs(d);
        snapYGuide = { x1: Math.min(moving.left, ...otherLefts, ...otherRights) - 2000, y1: other, x2: Math.max(moving.right, ...otherLefts, ...otherRights) + 2000, y2: other };
      }
    }
  }

  snapDx = bestDx;
  snapDy = bestDy;

  if (snapXGuide) guides.push(snapXGuide);
  if (snapYGuide) guides.push(snapYGuide);

  return { dx: snapDx, dy: snapDy, guides };
}
