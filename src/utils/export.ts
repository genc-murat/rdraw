import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import type { DrawElement, MermaidElement, NoteElement, CalloutElement, C4Element, C4RelationshipElement, Page } from "../types";

export interface DrawingDataV1 {
  version: 1;
  elements: DrawElement[];
}

export interface DrawingDataV2 {
  version: 2;
  pages: Page[];
  activePageId: string;
}

export type DrawingData = DrawingDataV1 | DrawingDataV2;

function migrateElement(el: any): DrawElement {
  // Migrate boolean arrowheads to ArrowheadStyle
  if (el.type === "arrow" || el.type === "line") {
    if (typeof el.endArrowhead === "boolean") {
      el.endArrowhead = el.endArrowhead ? "arrow" : "none";
    }
    if (typeof el.startArrowhead === "boolean") {
      el.startArrowhead = el.startArrowhead ? "arrow" : "none";
    }
  }
  if (el.type === "c4-relationship") {
    if (typeof el.endArrowhead === "boolean") {
      el.endArrowhead = el.endArrowhead ? "arrow" : "none";
    }
    if (typeof el.startArrowhead === "boolean") {
      el.startArrowhead = el.startArrowhead ? "arrow" : "none";
    }
  }
  // Default borderRadius for shapes if missing
  if ((el.type === "rounded-rectangle" || el.type === "rectangle") && el.borderRadius === undefined) {
    el.borderRadius = 0;
  }
  return el as DrawElement;
}

export async function saveDrawing(pages: Page[], activePageId: string, filePath?: string | null): Promise<string | null> {
  const path = filePath || await save({
    filters: [{ name: "RDraw", extensions: ["rdraw.json"] }],
  });

  if (!path) return null;

  const data: DrawingDataV2 = { version: 2, pages, activePageId };
  try {
    await invoke("save_file", { path, content: JSON.stringify(data, null, 2) });
    return path;
  } catch (err) {
    alert("Failed to save: " + (err instanceof Error ? err.message : String(err)));
    return null;
  }
}

export async function loadDrawing(): Promise<{ path: string; pages: Page[]; activePageId: string } | null> {
  const path = await open({
    filters: [{ name: "RDraw", extensions: ["rdraw.json", "json"] }],
  });

  if (!path || Array.isArray(path)) return null;

  let content: string;
  try {
    content = await invoke<string>("open_file", { path });
  } catch (err) {
    alert("Failed to open file: " + (err instanceof Error ? err.message : String(err)));
    return null;
  }

  let data: DrawingData;
  try {
    data = JSON.parse(content);
  } catch (err) {
    alert("Failed to parse drawing file: " + (err instanceof Error ? err.message : String(err)));
    return null;
  }

  if (data.version === 2 && "pages" in data) {
    const pages = data.pages.map(p => ({
      ...p,
      elements: p.elements.map(migrateElement),
    }));
    return { path, pages, activePageId: data.activePageId };
  }

  // v1 migration
  const v1 = data as DrawingDataV1;
  const elements = (v1.elements || []).map(migrateElement);
  return {
    path,
    pages: [{ id: "page-default", name: "Page 1", elements }],
    activePageId: "page-default",
  };
}

export async function exportPNG(canvas: HTMLCanvasElement): Promise<void> {
  const path = await save({
    filters: [{ name: "PNG", extensions: ["png"] }],
  });

  if (!path) return;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });

  if (!blob) {
    alert("Failed to create PNG: canvas export returned null");
    return;
  }

  try {
    const buffer = await blob.arrayBuffer();
    const data = Array.from(new Uint8Array(buffer));
    await invoke("export_image", { path, data });
  } catch (err) {
    alert("Failed to export PNG: " + (err instanceof Error ? err.message : String(err)));
  }
}

export async function exportSVG(
  elements: DrawElement[],
  viewTransform: { x: number; y: number; zoom: number }
): Promise<void> {
  const path = await save({
    filters: [{ name: "SVG", extensions: ["svg"] }],
  });

  if (!path) return;

  try {
    const svgContent = generateSVG(elements);
    await invoke("export_svg", { path, content: svgContent });
  } catch (err) {
    alert("Failed to export SVG: " + (err instanceof Error ? err.message : String(err)));
  }
}

function generateArrowheadSVG(
  point: [number, number],
  angle: number,
  style: string,
  strokeColor: string,
  strokeWidth: number
): string {
  if (style === "none") return "";

  const [x, y] = point;
  const arrowLen = 12 + strokeWidth * 2;
  const arrowAngle = Math.PI / 6;

  if (style === "arrow") {
    const a1x = x - arrowLen * Math.cos(angle - arrowAngle);
    const a1y = y - arrowLen * Math.sin(angle - arrowAngle);
    const a2x = x - arrowLen * Math.cos(angle + arrowAngle);
    const a2y = y - arrowLen * Math.sin(angle + arrowAngle);
    return `<line x1="${x}" y1="${y}" x2="${a1x}" y2="${a1y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />` +
      `<line x1="${x}" y1="${y}" x2="${a2x}" y2="${a2y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
  } else if (style === "triangle") {
    const a1x = x - arrowLen * Math.cos(angle - arrowAngle);
    const a1y = y - arrowLen * Math.sin(angle - arrowAngle);
    const a2x = x - arrowLen * Math.cos(angle + arrowAngle);
    const a2y = y - arrowLen * Math.sin(angle + arrowAngle);
    return `<polygon points="${x},${y} ${a1x},${a1y} ${a2x},${a2y}" fill="${strokeColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
  } else if (style === "circle") {
    const r = arrowLen * 0.35;
    const cx = x - arrowLen * Math.cos(angle);
    const cy = y - arrowLen * Math.sin(angle);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${strokeColor}" />`;
  } else if (style === "diamond") {
    const cx = x - arrowLen * 0.5 * Math.cos(angle);
    const cy = y - arrowLen * 0.5 * Math.sin(angle);
    const r = arrowLen * 0.4;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const perpX = -dy * r;
    const perpY = dx * r;
    const p1x = cx + perpX;
    const p1y = cy + perpY;
    const p2x = cx - r * dx * 1.2;
    const p2y = cy - r * dy * 1.2;
    const p3x = cx - perpX;
    const p3y = cy - perpY;
    return `<polygon points="${x},${y} ${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}" fill="${strokeColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
  } else if (style === "bar") {
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const halfLen = arrowLen * 0.4;
    return `<line x1="${x + perpX * halfLen}" y1="${y + perpY * halfLen}" x2="${x - perpX * halfLen}" y2="${y - perpY * halfLen}" stroke="${strokeColor}" stroke-width="${strokeWidth * 1.5}" />`;
  }

  return "";
}

function generateSVG(elements: DrawElement[]): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="2000" height="2000">`;

  for (const el of elements) {
    const strokeDash = (el as any).strokeStyle === "dashed" ? ' stroke-dasharray="8,4"' : (el as any).strokeStyle === "dotted" ? ' stroke-dasharray="2,4"' : "";
    const style = `stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="${el.fillColor === "transparent" ? "none" : el.fillColor}" opacity="${el.opacity}"${strokeDash}`;

    if (el.type === "rectangle") {
      svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" ${style} />`;
    } else if (el.type === "rounded-rectangle") {
      const r = Math.min(el.borderRadius || 0, Math.abs(el.width) / 2, Math.abs(el.height) / 2);
      svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${r}" ry="${r}" ${style} />`;
    } else if (el.type === "ellipse") {
      svg += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${Math.abs(el.width) / 2}" ry="${Math.abs(el.height) / 2}" ${style} />`;
    } else if (el.type === "diamond") {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      svg += `<polygon points="${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}" ${style} />`;
    } else if (el.type === "star") {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const outerR = Math.min(Math.abs(el.width), Math.abs(el.height)) / 2;
      const innerR = outerR * 0.4;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      svg += `<polygon points="${pts.join(" ")}" ${style} />`;
    } else if (el.type === "hexagon") {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const r = Math.min(Math.abs(el.width), Math.abs(el.height)) / 2;
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      svg += `<polygon points="${pts.join(" ")}" ${style} />`;
    } else if (el.type === "line" || el.type === "arrow") {
      if (el.points.length >= 2) {
        const start = el.points[0];
        const end = el.points[el.points.length - 1];
        svg += `<line x1="${el.x + start[0]}" y1="${el.y + start[1]}" x2="${el.x + end[0]}" y2="${el.y + end[1]}" ${style} />`;
        const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
        const endStyle = (el as any).endArrowhead ?? "arrow";
        const startStyle = (el as any).startArrowhead ?? "none";
        svg += generateArrowheadSVG([el.x + end[0], el.y + end[1]], angle, endStyle, el.strokeColor, el.strokeWidth);
        svg += generateArrowheadSVG([el.x + start[0], el.y + start[1]], angle + Math.PI, startStyle, el.strokeColor, el.strokeWidth);
      }
    } else if (el.type === "freehand") {
      if (el.points.length >= 2) {
        const d = el.points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${el.x + px},${el.y + py}`).join(" ");
        svg += `<path d="${d}" ${style} fill="none" />`;
      }
    } else if (el.type === "text") {
      svg += `<text x="${el.x}" y="${el.y + (el as any).fontSize}" fill="${el.strokeColor}" font-size="${(el as any).fontSize}px">${(el as any).text}</text>`;
    } else if (el.type === "note") {
      const nEl = el as NoteElement;
      const noteFill = el.fillColor === "transparent" ? "#fff59d" : el.fillColor;
      const foldSize = Math.min(20, el.width / 3, el.height / 3);
      svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="${noteFill}" opacity="${el.opacity}" />`;
      // Corner fold
      const fx = el.x + el.width - foldSize;
      const fy = el.y + el.height - foldSize;
      svg += `<polygon points="${fx},${el.y + el.height} ${el.x + el.width},${fy} ${fx},${fy}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="#e0e0e0" opacity="${el.opacity}" />`;
      // Text content
      if (nEl.text) {
        const lines = nEl.text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          svg += `<text x="${el.x + 12}" y="${el.y + 8 + nEl.fontSize + i * nEl.fontSize * 1.3}" fill="${el.strokeColor}" font-size="${nEl.fontSize}px">${escapeXml(lines[i])}</text>`;
        }
      }
    } else if (el.type === "callout") {
      const cEl = el as CalloutElement;
      const calloutFill = el.fillColor === "transparent" ? "#ffffff" : el.fillColor;
      const tailSize = 20;
      svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="8" ry="8" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="${calloutFill}" opacity="${el.opacity}" />`;
      const tailX = el.x + el.width / 2;
      const tailY = el.y + el.height;
      svg += `<polygon points="${tailX - tailSize / 2},${tailY} ${tailX},${tailY + tailSize} ${tailX + tailSize / 2},${tailY}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="${calloutFill}" opacity="${el.opacity}" />`;
      if (cEl.text) {
        const lines = cEl.text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          svg += `<text x="${el.x + 12}" y="${el.y + 8 + cEl.fontSize + i * cEl.fontSize * 1.3}" fill="${el.strokeColor}" font-size="${cEl.fontSize}px">${escapeXml(lines[i])}</text>`;
        }
      }
    } else if (el.type === "mermaid") {
      const mEl = el as MermaidElement;
      const origW = mEl.originalWidth || mEl.width;
      const origH = mEl.originalHeight || mEl.height;
      const sx = origW > 0 ? mEl.width / origW : 1;
      const sy = origH > 0 ? mEl.height / origH : 1;

      for (const edge of mEl.renderedEdges) {
        if (edge.points.length >= 2) {
          for (let i = 0; i < edge.points.length - 1; i++) {
            const [x1, y1] = edge.points[i];
            const [x2, y2] = edge.points[i + 1];
            svg += `<line x1="${el.x + x1 * sx}" y1="${el.y + y1 * sy}" x2="${el.x + x2 * sx}" y2="${el.y + y2 * sy}" ${style} />`;
          }
          if (edge.label) {
            const midIdx = Math.floor(edge.points.length / 2);
            const [mx, my] = edge.points[midIdx];
            svg += `<text x="${el.x + mx * sx}" y="${el.y + my * sy - 8}" fill="${el.strokeColor}" font-size="12px" text-anchor="middle">${edge.label}</text>`;
          }
        }
      }

      for (const node of mEl.renderedNodes) {
        const nx = el.x + node.x * sx;
        const ny = el.y + node.y * sy;
        const nw = node.width * sx;
        const nh = node.height * sy;

        if (node.shape === "diamond") {
          const cx = nx + nw / 2;
          const cy = ny + nh / 2;
          svg += `<polygon points="${cx},${ny} ${nx + nw},${cy} ${cx},${ny + nh} ${nx},${cy}" ${style} />`;
        } else if (node.shape === "circle") {
          svg += `<ellipse cx="${nx + nw / 2}" cy="${ny + nh / 2}" rx="${nw / 2}" ry="${nh / 2}" ${style} />`;
        } else {
          svg += `<rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" ${style} />`;
        }

        if (node.label) {
          svg += `<text x="${nx + nw / 2}" y="${ny + nh / 2}" fill="${el.strokeColor}" font-size="14px" text-anchor="middle" dominant-baseline="middle">${node.label}</text>`;
        }
      }
    } else if (el.type === "c4-relationship") {
      const c4rel = el as C4RelationshipElement;
      if (c4rel.points.length >= 2) {
        const start = c4rel.points[0];
        const end = c4rel.points[c4rel.points.length - 1];
        const c4StrokeDash = (c4rel as any).strokeStyle === "dashed" ? "8,4" : (c4rel as any).strokeStyle === "dotted" ? "2,4" : "6,4";
        svg += `<line x1="${el.x + start[0]}" y1="${el.y + start[1]}" x2="${el.x + end[0]}" y2="${el.y + end[1]}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" stroke-dasharray="${c4StrokeDash}" opacity="${el.opacity}" />`;
        const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
        const endStyle = (c4rel as any).endArrowhead ?? "arrow";
        const startStyle = (c4rel as any).startArrowhead ?? "none";
        svg += generateArrowheadSVG([el.x + end[0], el.y + end[1]], angle, endStyle, el.strokeColor, el.strokeWidth);
        svg += generateArrowheadSVG([el.x + start[0], el.y + start[1]], angle + Math.PI, startStyle, el.strokeColor, el.strokeWidth);
        if (c4rel.label) {
          const mx = el.x + (start[0] + end[0]) / 2;
          const my = el.y + (start[1] + end[1]) / 2;
          svg += `<text x="${mx}" y="${my - 4}" fill="${el.strokeColor}" font-size="12px" text-anchor="middle">${escapeXml(c4rel.label)}</text>`;
        }
      }
    } else if (el.type.startsWith("c4-")) {
      const c4el = el as C4Element;
      const c4Type = c4el.c4Type;
      if (c4Type === "c4-system-boundary" || c4Type === "c4-enterprise-boundary") {
        const c4BoundaryDash = (el as any).strokeStyle === "dashed" ? "8,4" : (el as any).strokeStyle === "dotted" ? "2,4" : "8,4";
        svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="none" stroke-dasharray="${c4BoundaryDash}" opacity="${el.opacity}" />`;
        const label = c4el.label || (c4Type === "c4-enterprise-boundary" ? "Enterprise" : "System");
        svg += `<text x="${el.x + 8}" y="${el.y + 18}" fill="${el.strokeColor}" font-size="12px" font-weight="bold">${escapeXml(label)}</text>`;
      } else if (c4Type === "c4-database") {
        const ry = el.height * 0.12;
        svg += `<rect x="${el.x}" y="${el.y + ry}" width="${el.width}" height="${el.height - ry * 2}" fill="${el.fillColor}" opacity="${el.opacity}" />`;
        svg += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + ry}" rx="${el.width / 2}" ry="${ry}" fill="${el.fillColor}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}" />`;
        svg += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height - ry}" rx="${el.width / 2}" ry="${ry}" fill="${el.fillColor}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}" />`;
        svg += generateC4LabelSvg(c4el, el.x + el.width / 2, el.y + el.height / 2);
      } else if (c4Type === "c4-person") {
        const headR = Math.min(el.width, el.height) * 0.15;
        const cx = el.x + el.width / 2;
        svg += `<circle cx="${cx}" cy="${el.y + headR + 4}" r="${headR}" fill="${el.fillColor}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}" />`;
        const bodyTop = el.y + headR * 2 + 4;
        const bodyBottom = el.y + el.height * 0.6;
        svg += `<line x1="${cx}" y1="${bodyTop}" x2="${cx}" y2="${bodyBottom}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}" />`;
        svg += `<line x1="${cx}" y1="${bodyBottom}" x2="${cx - el.width * 0.25}" y2="${el.y + el.height - 4}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}" />`;
        svg += `<line x1="${cx}" y1="${bodyBottom}" x2="${cx + el.width * 0.25}" y2="${el.y + el.height - 4}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}" />`;
        svg += generateC4LabelSvg(c4el, cx, el.y + el.height * 0.7);
      } else {
        svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="8" ry="8" fill="${el.fillColor}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}" />`;
        svg += generateC4LabelSvg(c4el, el.x + el.width / 2, el.y + el.height / 2);
      }
    }
  }

  svg += `</svg>`;
  return svg;
}

function generateC4LabelSvg(el: C4Element, cx: number, cy: number): string {
  let svg = "";
  const lines: { text: string; fontSize: number }[] = [];
  if (el.label) lines.push({ text: el.label, fontSize: 12 });
  if (el.description) lines.push({ text: el.description, fontSize: 10 });
  if (el.technology) lines.push({ text: `[${el.technology}]`, fontSize: 9 });

  if (lines.length === 0) return "";

  const totalHeight = lines.reduce((sum, l) => sum + l.fontSize * 1.3, 0);
  let startY = cy - totalHeight / 2;
  const fill = (el.c4Type === "c4-system-boundary" || el.c4Type === "c4-enterprise-boundary") ? el.strokeColor : "#ffffff";

  for (const line of lines) {
    startY += line.fontSize * 1.3;
    svg += `<text x="${cx}" y="${startY}" fill="${fill}" font-size="${line.fontSize}px" text-anchor="middle">${escapeXml(line.text)}</text>`;
  }
  return svg;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
