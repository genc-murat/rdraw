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
  diagramType: "flowchart" | "sequence";
}

export async function renderMermaidDiagram(code: string): Promise<MermaidRenderResult> {
  initMermaid();

  const parseInfo = await mermaid.parse(code);
  const diagramType: "flowchart" | "sequence" =
    parseInfo.diagramType === "sequence" ? "sequence" : "flowchart";

  const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const { svg } = await mermaid.render(id, code);

  return parseMermaidSVG(svg, diagramType);
}

function parseMermaidSVG(svgString: string, diagramType: "flowchart" | "sequence"): MermaidRenderResult {
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
      return { nodes: [], edges: [], width: 300, height: 200, diagramType };
    }

    let nodes: MermaidNode[];
    let edges: MermaidEdge[];

    if (diagramType === "sequence") {
      nodes = extractSequenceNodes(svgEl);
      edges = extractSequenceEdges(svgEl);
    } else {
      nodes = extractNodes(svgEl);
      edges = extractEdges(svgEl);
    }

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
      diagramType,
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

function extractSequenceNodes(svgEl: SVGElement): MermaidNode[] {
  const nodes: MermaidNode[] = [];
  const seenNames = new Set<string>();

  // Find actors via text labels — works for all actor types (participant, database,
  // boundary, control, entity, actor, collections, queue).
  // Text elements have class "actor actor-box" or "actor actor-man".
  const actorTexts = svgEl.querySelectorAll("text.actor");
  for (const textEl of actorTexts) {
    const label = textEl.textContent?.trim() || "";

    // Walk up to the <g> with a name attribute (actor container group)
    let container: Element | null = textEl.parentElement;
    while (container && container !== svgEl) {
      if (container.hasAttribute("name")) break;
      container = container.parentElement;
    }
    if (!container || container === svgEl) continue;

    const name = container.getAttribute("name") || "";
    if (seenNames.has(name)) continue;
    seenNames.add(name);

    // Compute bounding box from all shape children in the actor group
    const bounds = getGroupBounds(container);
    if (bounds) {
      nodes.push({
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX || 100,
        height: bounds.maxY - bounds.minY || 40,
        label: label || name,
        shape: "rect",
      });
    }
  }

  // Fallback: find actors by rect.actor (for participant types where text lookup
  // might not reach the named group due to nesting)
  const actorRects = svgEl.querySelectorAll("rect.actor");
  for (const rect of actorRects) {
    let container: Element | null = rect.parentElement;
    while (container && container !== svgEl) {
      if (container.hasAttribute("name")) break;
      container = container.parentElement;
    }
    const name = container?.getAttribute("name") || "";
    if (name && seenNames.has(name)) continue;
    if (name) seenNames.add(name);

    const x = parseFloat(rect.getAttribute("x") || "0");
    const y = parseFloat(rect.getAttribute("y") || "0");
    const width = parseFloat(rect.getAttribute("width") || "0");
    const height = parseFloat(rect.getAttribute("height") || "0");

    let label = name;
    if (!label) {
      const parentG = rect.parentElement;
      if (parentG) {
        const textEl = parentG.querySelector("text.actor-box, text.actor");
        if (textEl) label = textEl.textContent?.trim() || "";
      }
    }

    nodes.push({ x, y, width: width || 100, height: height || 40, label, shape: "rect" });
  }

  // Note boxes
  const noteRects = svgEl.querySelectorAll("rect.note");
  for (const rect of noteRects) {
    const x = parseFloat(rect.getAttribute("x") || "0");
    const y = parseFloat(rect.getAttribute("y") || "0");
    const width = parseFloat(rect.getAttribute("width") || "0");
    const height = parseFloat(rect.getAttribute("height") || "0");

    let label = "";
    const parentG = rect.parentElement;
    if (parentG) {
      const textEl = parentG.querySelector("text");
      if (textEl) {
        label = textEl.textContent?.trim() || "";
      }
    }

    nodes.push({ x, y, width: width || 100, height: height || 40, label, shape: "rect" });
  }

  // Label boxes (polygon.labelBox) — used for loops/alt/opt blocks
  const labelBoxes = svgEl.querySelectorAll("polygon.labelBox");
  for (const polygon of labelBoxes) {
    const points = polygon.getAttribute("points") || "";
    const parsedPoints = points.trim().split(/\s+/).map((p) => {
      const [px, py] = p.split(",").map(Number);
      return { x: px, y: py };
    });

    if (parsedPoints.length >= 2) {
      let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
      for (const p of parsedPoints) {
        pMinX = Math.min(pMinX, p.x);
        pMinY = Math.min(pMinY, p.y);
        pMaxX = Math.max(pMaxX, p.x);
        pMaxY = Math.max(pMaxY, p.y);
      }

      let label = "";
      const parentG = polygon.parentElement;
      if (parentG) {
        const textEl = parentG.querySelector("text");
        if (textEl) {
          label = textEl.textContent?.trim() || "";
        }
      }

      nodes.push({
        x: pMinX,
        y: pMinY,
        width: pMaxX - pMinX || 100,
        height: pMaxY - pMinY || 40,
        label,
        shape: "rect",
      });
    }
  }

  return nodes;
}

function getGroupBounds(group: Element): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;

  const shapes = group.querySelectorAll("rect, circle, ellipse, path, line, polygon");
  for (const el of shapes) {
    const tag = el.tagName.toLowerCase();
    if (tag === "rect") {
      const x = parseFloat(el.getAttribute("x") || "0");
      const y = parseFloat(el.getAttribute("y") || "0");
      const w = parseFloat(el.getAttribute("width") || "0");
      const h = parseFloat(el.getAttribute("height") || "0");
      if (w > 0 && h > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
        found = true;
      }
    } else if (tag === "circle") {
      const cx = parseFloat(el.getAttribute("cx") || "0");
      const cy = parseFloat(el.getAttribute("cy") || "0");
      const r = parseFloat(el.getAttribute("r") || "0");
      if (r > 0) {
        minX = Math.min(minX, cx - r);
        minY = Math.min(minY, cy - r);
        maxX = Math.max(maxX, cx + r);
        maxY = Math.max(maxY, cy + r);
        found = true;
      }
    } else if (tag === "ellipse") {
      const cx = parseFloat(el.getAttribute("cx") || "0");
      const cy = parseFloat(el.getAttribute("cy") || "0");
      const rx = parseFloat(el.getAttribute("rx") || "0");
      const ry = parseFloat(el.getAttribute("ry") || "0");
      if (rx > 0 && ry > 0) {
        minX = Math.min(minX, cx - rx);
        minY = Math.min(minY, cy - ry);
        maxX = Math.max(maxX, cx + rx);
        maxY = Math.max(maxY, cy + ry);
        found = true;
      }
    } else if (tag === "line") {
      const x1 = parseFloat(el.getAttribute("x1") || "0");
      const y1 = parseFloat(el.getAttribute("y1") || "0");
      const x2 = parseFloat(el.getAttribute("x2") || "0");
      const y2 = parseFloat(el.getAttribute("y2") || "0");
      minX = Math.min(minX, x1, x2);
      minY = Math.min(minY, y1, y2);
      maxX = Math.max(maxX, x1, x2);
      maxY = Math.max(maxY, y1, y2);
      found = true;
    } else if (tag === "polygon") {
      const points = el.getAttribute("points") || "";
      const parsed = points.trim().split(/\s+/).map((p) => {
        const [px, py] = p.split(",").map(Number);
        return { x: px, y: py };
      });
      for (const p of parsed) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
        found = true;
      }
    } else if (tag === "path") {
      const d = el.getAttribute("d") || "";
      const pathBounds = getSVGBounds(d);
      if (isFinite(pathBounds.minX)) {
        minX = Math.min(minX, pathBounds.minX);
        minY = Math.min(minY, pathBounds.minY);
        maxX = Math.max(maxX, pathBounds.maxX);
        maxY = Math.max(maxY, pathBounds.maxY);
        found = true;
      }
    }
  }

  // Also include text elements for bounds
  const texts = group.querySelectorAll("text");
  for (const textEl of texts) {
    const tx = parseFloat(textEl.getAttribute("x") || "0");
    const ty = parseFloat(textEl.getAttribute("y") || "0");
    if (isFinite(tx) && isFinite(ty)) {
      // Text x/y is typically the center, estimate bounds
      const estWidth = (textEl.textContent?.length || 4) * 7;
      const estHeight = 16;
      minX = Math.min(minX, tx - estWidth / 2);
      minY = Math.min(minY, ty - estHeight / 2);
      maxX = Math.max(maxX, tx + estWidth / 2);
      maxY = Math.max(maxY, ty + estHeight / 2);
      found = true;
    }
  }

  return found ? { minX, minY, maxX, maxY } : null;
}

function extractSequenceEdges(svgEl: SVGElement): MermaidEdge[] {
  const edges: MermaidEdge[] = [];

  const messageLines = svgEl.querySelectorAll("line.messageLine0, line.messageLine1");
  const messageTexts = svgEl.querySelectorAll("text.messageText");

  // Collect text y-positions for label matching
  const textPositions: { text: string; y: number }[] = [];
  for (const textEl of messageTexts) {
    const yAttr = textEl.getAttribute("y");
    if (yAttr) {
      textPositions.push({
        text: textEl.textContent?.trim() || "",
        y: parseFloat(yAttr),
      });
    }
  }

  for (const line of messageLines) {
    const x1 = parseFloat(line.getAttribute("x1") || "0");
    const y1 = parseFloat(line.getAttribute("y1") || "0");
    const x2 = parseFloat(line.getAttribute("x2") || "0");
    const y2 = parseFloat(line.getAttribute("y2") || "0");

    // Match label by y-coordinate proximity (message text sits near the line)
    let label: string | undefined;
    const lineMidY = (y1 + y2) / 2;
    let closestDist = Infinity;
    for (const tp of textPositions) {
      const dist = Math.abs(tp.y - lineMidY);
      if (dist < closestDist && dist < 20) {
        closestDist = dist;
        label = tp.text || undefined;
      }
    }

    edges.push({ points: [[x1, y1], [x2, y2]], label });
  }

  // Actor lifelines — vertical lines connecting participant boxes top to bottom
  const lifelines = svgEl.querySelectorAll("line.actor-line");
  for (const line of lifelines) {
    const x1 = parseFloat(line.getAttribute("x1") || "0");
    const y1 = parseFloat(line.getAttribute("y1") || "0");
    const x2 = parseFloat(line.getAttribute("x2") || "0");
    const y2 = parseFloat(line.getAttribute("y2") || "0");
    edges.push({ points: [[x1, y1], [x2, y2]] });
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
