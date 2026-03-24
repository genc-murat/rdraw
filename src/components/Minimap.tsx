import { useRef, useEffect, useCallback } from "react";
import useAppStore from "../store/useAppStore";
import { getElementBounds } from "../utils/geometry";

const MINIMAP_W = 160;
const MINIMAP_H = 120;
const PADDING = 10;

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const elements = useAppStore((s) => s.elements);
  const viewTransform = useAppStore((s) => s.viewTransform);
  const setViewTransform = useAppStore((s) => s.setViewTransform);

  // Resize minimap canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_W * dpr;
    canvas.height = MINIMAP_H * dpr;
    canvas.style.width = `${MINIMAP_W}px`;
    canvas.style.height = `${MINIMAP_H}px`;
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "rgba(30, 30, 30, 0.9)";
      ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

      if (elements.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const el of elements) {
          const b = getElementBounds(el);
          minX = Math.min(minX, b.x);
          minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + b.width);
          maxY = Math.max(maxY, b.y + b.height);
        }

        const contentW = maxX - minX || 1;
        const contentH = maxY - minY || 1;
        const scaleX = (MINIMAP_W - PADDING * 2) / contentW;
        const scaleY = (MINIMAP_H - PADDING * 2) / contentH;
        const scale = Math.min(scaleX, scaleY, 1);

        const offsetX = PADDING + ((MINIMAP_W - PADDING * 2) - contentW * scale) / 2 - minX * scale;
        const offsetY = PADDING + ((MINIMAP_H - PADDING * 2) - contentH * scale) / 2 - minY * scale;

        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        for (const el of elements) {
          const b = getElementBounds(el);
          ctx.fillStyle = el.fillColor === "transparent" ? "rgba(255,255,255,0.15)" : el.fillColor;
          ctx.globalAlpha = el.opacity * 0.8;
          ctx.fillRect(b.x, b.y, Math.max(b.width, 2), Math.max(b.height, 2));
        }

        ctx.globalAlpha = 1;
        const parentCanvas = canvas.closest(".canvas-wrapper") as HTMLElement;
        const parentW = parentCanvas ? parentCanvas.clientWidth : 800;
        const parentH = parentCanvas ? parentCanvas.clientHeight : 600;

        const vpX = -viewTransform.x / viewTransform.zoom;
        const vpY = -viewTransform.y / viewTransform.zoom;
        const vpW = parentW / viewTransform.zoom;
        const vpH = parentH / viewTransform.zoom;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.strokeRect(vpX, vpY, vpW, vpH);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.fillRect(vpX, vpY, vpW, vpH);
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [elements, viewTransform]);

  // Click to navigate
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (elements.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const el of elements) {
        const b = getElementBounds(el);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      }

      const contentW = maxX - minX || 1;
      const contentH = maxY - minY || 1;
      const scaleX = (MINIMAP_W - PADDING * 2) / contentW;
      const scaleY = (MINIMAP_H - PADDING * 2) / contentH;
      const scale = Math.min(scaleX, scaleY, 1);

      const offsetX = PADDING + ((MINIMAP_W - PADDING * 2) - contentW * scale) / 2 - minX * scale;
      const offsetY = PADDING + ((MINIMAP_H - PADDING * 2) - contentH * scale) / 2 - minY * scale;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const canvasX = (clickX - offsetX) / scale;
      const canvasY = (clickY - offsetY) / scale;

      const parentCanvas = canvas.closest(".canvas-wrapper") as HTMLElement;
      if (!parentCanvas) return;
      const parentW = parentCanvas.clientWidth;
      const parentH = parentCanvas.clientHeight;

      setViewTransform({
        x: -canvasX * viewTransform.zoom + parentW / 2,
        y: -canvasY * viewTransform.zoom + parentH / 2,
      });
    },
    [elements, viewTransform.zoom, setViewTransform]
  );

  return (
    <div className="minimap-wrapper" onClick={handleClick}>
      <canvas ref={canvasRef} />
    </div>
  );
}
