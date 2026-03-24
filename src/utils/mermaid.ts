import mermaid from "mermaid";
import type { MermaidNode, MermaidEdge } from "../types";

let initialized = false;

export function initMermaid(): void {
  if (initialized) return;
  initialized = true;

  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    fontFamily: "sans-serif",
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: "basis",
    },
  });
}

export async function parseMermaidCode(code: string): Promise<boolean> {
  initMermaid();
  try {
    await mermaid.parse(code, { suppressErrors: true });
    return true;
  } catch {
    return false;
  }
}

export interface MermaidRenderResult {
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  width: number;
  height: number;
}

export async function renderMermaidDiagram(code: string): Promise<MermaidRenderResult> {
  initMermaid();

  const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const { svg } = await mermaid.render(id, code);

  return parseMermaidSVG(svg);
}

function parseMermaidSVG(svgString: string): MermaidRenderResult {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-99999px";
  container.style.top = "-99999px";
  container.style.visibility = "hidden";
  container.innerHTML = svgString;
  document.body.appendChild(container);

  try {
    const svgEl = container.querySelector("svg");
    if (!svgEl) {
      return { nodes: [], edges: [], width: 300, height: 200 };
    }

    const nodes = extractNodes(svgEl);
    const edges = extractEdges(svgEl);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    if (!isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 300;
      maxY = 200;
    }

    const padding = 10;
    for (const node of nodes) {
      node.x -= minX - padding;
      node.y -= minY - padding;
    }
    for (const edge of edges) {
      edge.points = edge.points.map(([px, py]) => [px - minX + padding, py - minY + padding] as [number, number]);
    }

    return {
      nodes,
      edges,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  } finally {
    document.body.removeChild(container);
  }
}

function extractNodes(svgEl: SVGElement): MermaidNode[] {
  const nodes: MermaidNode[] = [];
  const nodeGroups = svgEl.querySelectorAll("g.node");

  for (const group of nodeGroups) {
    const transform = group.getAttribute("transform") || "";
    const translateMatch = transform.match(/translate\(\s*([^,\s]+)[,\s]+([^)]+)\)/);
    let gx = translateMatch ? parseFloat(translateMatch[1]) : 0;
    let gy = translateMatch ? parseFloat(translateMatch[2]) : 0;

    const rect = group.querySelector("rect");
    const ellipse = group.querySelector("ellipse");
    const polygon = group.querySelector("polygon");
    const path = group.querySelector("path.label-link");
    const labelEl = group.querySelector(".label");

    let width = 0;
    let height = 0;
    let shape: MermaidNode["shape"] = "rect";

    if (rect) {
      const rx = parseFloat(rect.getAttribute("x") || "0");
      const ry = parseFloat(rect.getAttribute("y") || "0");
      width = parseFloat(rect.getAttribute("width") || "0");
      height = parseFloat(rect.getAttribute("height") || "0");
      gx += rx;
      gy += ry;

      const cornerRx = parseFloat(rect.getAttribute("rx") || "0");
      if (cornerRx > 0) {
        shape = "stadium";
      }
    } else if (ellipse) {
      const cx = parseFloat(ellipse.getAttribute("cx") || "0");
      const cy = parseFloat(ellipse.getAttribute("cy") || "0");
      const rx = parseFloat(ellipse.getAttribute("rx") || "0");
      const ry = parseFloat(ellipse.getAttribute("ry") || "0");
      gx += cx - rx;
      gy += cy - ry;
      width = rx * 2;
      height = ry * 2;
      shape = "circle";
    } else if (polygon) {
      const points = polygon.getAttribute("points") || "";
      const parsedPoints = points.trim().split(/\s+/).map((p) => {
        const [x, y] = p.split(",").map(Number);
        return { x, y };
      });

      if (parsedPoints.length >= 4) {
        let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
        for (const p of parsedPoints) {
          pMinX = Math.min(pMinX, p.x);
          pMinY = Math.min(pMinY, p.y);
          pMaxX = Math.max(pMaxX, p.x);
          pMaxY = Math.max(pMaxY, p.y);
        }
        gx += pMinX;
        gy += pMinY;
        width = pMaxX - pMinX;
        height = pMaxY - pMinY;

        if (parsedPoints.length === 4) {
          shape = "diamond";
        } else if (parsedPoints.length === 6) {
          shape = "hexagon";
        }
      }
    } else if (path) {
      const d = path.getAttribute("d") || "";
      const bounds = getSVGBounds(d);
      gx += bounds.minX;
      gy += bounds.minY;
      width = bounds.maxX - bounds.minX;
      height = bounds.maxY - bounds.minY;
      shape = "stadium";
    }

    let label = "";
    if (labelEl) {
      const foreignObject = labelEl.querySelector("foreignObject");
      if (foreignObject) {
        label = foreignObject.textContent?.trim() || "";
      } else {
        const textEl = labelEl.querySelector("text");
        if (textEl) {
          label = textEl.textContent?.trim() || "";
        } else {
          label = labelEl.textContent?.trim() || "";
        }
      }
    }

    if (width < 1) width = 100;
    if (height < 1) height = 40;

    nodes.push({ x: gx, y: gy, width, height, label, shape });
  }

  return nodes;
}

function extractEdges(svgEl: SVGElement): MermaidEdge[] {
  const edges: MermaidEdge[] = [];

  const edgePathsContainer = svgEl.querySelector("g.edgePaths");
  if (!edgePathsContainer) return edges;

  const pathElements = edgePathsContainer.querySelectorAll("path");

  const edgeLabelsContainer = svgEl.querySelector("g.edgeLabels");
  const labelGroups = edgeLabelsContainer
    ? edgeLabelsContainer.querySelectorAll("g.edgeLabel")
    : [];

  for (let i = 0; i < pathElements.length; i++) {
    const pathEl = pathElements[i];
    const d = pathEl.getAttribute("d") || "";
    if (!d) continue;

    const points = pathToPoints(d);
    if (points.length < 2) continue;

    let label: string | undefined;
    if (i < labelGroups.length) {
      const labelGroup = labelGroups[i];
      const foreignObject = labelGroup.querySelector("foreignObject");
      if (foreignObject) {
        label = foreignObject.textContent?.trim() || undefined;
      } else {
        const textEl = labelGroup.querySelector("text");
        if (textEl) {
          label = textEl.textContent?.trim() || undefined;
        }
      }
      if (label === "") label = undefined;
    }

    edges.push({ points, label });
  }

  return edges;
}

function pathToPoints(d: string): [number, number][] {
  const points: [number, number][] = [];
  const commands = d.match(/[MLQCZ][^MLQCZ]*/gi) || [];

  let cx = 0, cy = 0;

  for (const cmd of commands) {
    const type = cmd[0];
    const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));

    if (type === "M" || type === "m") {
      cx = type === "M" ? args[0] : cx + args[0];
      cy = type === "M" ? args[1] : cy + args[1];
      points.push([cx, cy]);
    } else if (type === "L" || type === "l") {
      for (let i = 0; i < args.length; i += 2) {
        cx = type === "L" ? args[i] : cx + args[i];
        cy = type === "L" ? args[i + 1] : cy + args[i + 1];
        points.push([cx, cy]);
      }
    } else if (type === "C" || type === "c") {
      for (let i = 0; i < args.length; i += 6) {
        const x1 = type === "C" ? args[i] : cx + args[i];
        const y1 = type === "C" ? args[i + 1] : cy + args[i + 1];
        const x2 = type === "C" ? args[i + 2] : cx + args[i + 2];
        const y2 = type === "C" ? args[i + 3] : cy + args[i + 3];
        const ex = type === "C" ? args[i + 4] : cx + args[i + 4];
        const ey = type === "C" ? args[i + 5] : cy + args[i + 5];
        const sampled = sampleCubicBezier(cx, cy, x1, y1, x2, y2, ex, ey, 8);
        for (const p of sampled) {
          points.push(p);
        }
        cx = ex;
        cy = ey;
      }
    } else if (type === "Q" || type === "q") {
      for (let i = 0; i < args.length; i += 4) {
        const x1 = type === "Q" ? args[i] : cx + args[i];
        const y1 = type === "Q" ? args[i + 1] : cy + args[i + 1];
        const ex = type === "Q" ? args[i + 2] : cx + args[i + 2];
        const ey = type === "Q" ? args[i + 3] : cy + args[i + 3];
        const sampled = sampleQuadraticBezier(cx, cy, x1, y1, ex, ey, 6);
        for (const p of sampled) {
          points.push(p);
        }
        cx = ex;
        cy = ey;
      }
    }
  }

  return points;
}

function sampleCubicBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  steps: number
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
    points.push([x, y]);
  }
  return points;
}

function sampleQuadraticBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  steps: number
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
    const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
    points.push([x, y]);
  }
  return points;
}

function getSVGBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const points = pathToPoints(d);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 40 };
  }
  return { minX, minY, maxX, maxY };
}
