import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import type { DrawElement } from "../types";

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
    }
  }

  svg += `</svg>`;
  return svg;
}
