import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import type { DrawElement, MermaidElement } from "../types";

export interface DrawingData {
  version: number;
  elements: DrawElement[];
}

export async function saveDrawing(elements: DrawElement[], filePath?: string | null): Promise<string | null> {
  const path = filePath || await save({
    filters: [{ name: "RDraw", extensions: ["rdraw.json"] }],
  });

  if (!path) return null;

  const data: DrawingData = { version: 1, elements };
  await invoke("save_file", { path, content: JSON.stringify(data, null, 2) });
  return path;
}

export async function loadDrawing(): Promise<{ path: string; elements: DrawElement[] } | null> {
  const path = await open({
    filters: [{ name: "RDraw", extensions: ["rdraw.json", "json"] }],
  });

  if (!path || Array.isArray(path)) return null;

  const content = await invoke<string>("open_file", { path });
  const data: DrawingData = JSON.parse(content);
  return { path, elements: data.elements || [] };
}

export async function exportPNG(canvas: HTMLCanvasElement): Promise<void> {
  const path = await save({
    filters: [{ name: "PNG", extensions: ["png"] }],
  });

  if (!path) return;

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });

  const buffer = await blob.arrayBuffer();
  const data = Array.from(new Uint8Array(buffer));
  await invoke("export_image", { path, data });
}

export async function exportSVG(
  elements: DrawElement[],
  viewTransform: { x: number; y: number; zoom: number }
): Promise<void> {
  const path = await save({
    filters: [{ name: "SVG", extensions: ["svg"] }],
  });

  if (!path) return;

  const svgContent = generateSVG(elements);
  await invoke("export_svg", { path, content: svgContent });
}

function generateSVG(elements: DrawElement[]): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="2000" height="2000">`;

  for (const el of elements) {
    const style = `stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="${el.fillColor === "transparent" ? "none" : el.fillColor}" opacity="${el.opacity}"`;

    if (el.type === "rectangle") {
      svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" ${style} />`;
    } else if (el.type === "ellipse") {
      svg += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${Math.abs(el.width) / 2}" ry="${Math.abs(el.height) / 2}" ${style} />`;
    } else if (el.type === "diamond") {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      svg += `<polygon points="${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}" ${style} />`;
    } else if (el.type === "line" || el.type === "arrow") {
      if (el.points.length >= 2) {
        const start = el.points[0];
        const end = el.points[el.points.length - 1];
        svg += `<line x1="${el.x + start[0]}" y1="${el.y + start[1]}" x2="${el.x + end[0]}" y2="${el.y + end[1]}" ${style} />`;
      }
    } else if (el.type === "freehand") {
      if (el.points.length >= 2) {
        const d = el.points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${el.x + px},${el.y + py}`).join(" ");
        svg += `<path d="${d}" ${style} fill="none" />`;
      }
    } else if (el.type === "text") {
      svg += `<text x="${el.x}" y="${el.y + (el as any).fontSize}" fill="${el.strokeColor}" font-size="${(el as any).fontSize}px">${(el as any).text}</text>`;
    } else if (el.type === "mermaid") {
      const mEl = el as MermaidElement;
      const origW = mEl.originalWidth || mEl.width;
      const origH = mEl.originalHeight || mEl.height;
      const sx = origW > 0 ? mEl.width / origW : 1;
      const sy = origH > 0 ? mEl.height / origH : 1;
      const style = `stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="${el.fillColor === "transparent" ? "none" : el.fillColor}" opacity="${el.opacity}"`;

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
    }
  }

  svg += `</svg>`;
  return svg;
}
