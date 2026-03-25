import { useRef, useEffect, useCallback, useState } from "react";
import useAppStore from "../store/useAppStore";
import { getElementBounds } from "../utils/geometry";

const MINIMAP_W = 160;
const MINIMAP_H = 120;
const PADDING = 10;

function computeMinimapTransform(
  elements: any[],
  minimapW: number,
  minimapH: number,
  padding: number
) {
  if (elements.length === 0) return null;

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
  const scaleX = (minimapW - padding * 2) / contentW;
  const scaleY = (minimapH - padding * 2) / contentH;
  const scale = Math.min(scaleX, scaleY, 1);

  const offsetX = padding + ((minimapW - padding * 2) - contentW * scale) / 2 - minX * scale;
  const offsetY = padding + ((minimapH - padding * 2) - contentH * scale) / 2 - minY * scale;

  return { scale, offsetX, offsetY, minX, minY, contentW, contentH };
}

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const elements = useAppStore((s) => s.elements);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const viewTransform = useAppStore((s) => s.viewTransform);
  const setViewTransform = useAppStore((s) => s.setViewTransform);
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_W * dpr;
    canvas.height = MINIMAP_H * dpr;
    canvas.style.width = `${MINIMAP_W}px`;
    canvas.style.height = `${MINIMAP_H}px`;
  }, []);

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

      const isLight = theme === "light";
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = isLight ? "rgba(245, 245, 245, 0.95)" : "rgba(30, 30, 30, 0.95)";
      ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

      // Border
      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, MINIMAP_W, MINIMAP_H);

      if (elements.length > 0) {
        const transform = computeMinimapTransform(elements, MINIMAP_W, MINIMAP_H, PADDING);
        if (transform) {
          const { scale, offsetX, offsetY } = transform;
          const selectedSet = new Set(selectedIds);

          ctx.translate(offsetX, offsetY);
          ctx.scale(scale, scale);

          for (const el of elements) {
            const b = getElementBounds(el);
            const isSelected = selectedSet.has(el.id);

            ctx.globalAlpha = el.opacity * 0.8;

            if (isSelected) {
              ctx.fillStyle = isLight ? "rgba(59, 130, 246, 0.5)" : "rgba(96, 165, 250, 0.5)";
            } else if (el.fillColor === "transparent") {
              ctx.fillStyle = isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)";
            } else {
              ctx.fillStyle = el.fillColor;
            }
            ctx.fillRect(b.x, b.y, Math.max(b.width, 2 / scale), Math.max(b.height, 2 / scale));

            if (isSelected) {
              ctx.strokeStyle = isLight ? "rgba(59, 130, 246, 0.9)" : "rgba(96, 165, 250, 0.9)";
              ctx.lineWidth = 2 / scale;
              ctx.strokeRect(b.x, b.y, Math.max(b.width, 2 / scale), Math.max(b.height, 2 / scale));
            }
          }

          ctx.globalAlpha = 1;

          // Viewport rectangle
          const parentCanvas = canvas.closest(".canvas-wrapper") as HTMLElement;
          const parentW = parentCanvas ? parentCanvas.clientWidth : 800;
          const parentH = parentCanvas ? parentCanvas.clientHeight : 600;

          const vpX = -viewTransform.x / viewTransform.zoom;
          const vpY = -viewTransform.y / viewTransform.zoom;
          const vpW = parentW / viewTransform.zoom;
          const vpH = parentH / viewTransform.zoom;

          ctx.strokeStyle = isLight ? "rgba(59, 130, 246, 0.8)" : "rgba(96, 165, 250, 0.8)";
          ctx.lineWidth = 2 / scale;
          ctx.setLineDash([4 / scale, 4 / scale]);
          ctx.strokeRect(vpX, vpY, vpW, vpH);
          ctx.setLineDash([]);

          // Viewport fill
          ctx.fillStyle = isLight ? "rgba(59, 130, 246, 0.06)" : "rgba(96, 165, 250, 0.06)";
          ctx.fillRect(vpX, vpY, vpW, vpH);
        }
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [elements, selectedIds, viewTransform, theme]);

  const navigateToPos = useCallback(
    (clientX: number, clientY: number) => {
      if (elements.length === 0) return;

      const transform = computeMinimapTransform(elements, MINIMAP_W, MINIMAP_H, PADDING);
      if (!transform) return;

      const { scale, offsetX, offsetY } = transform;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;

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

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      navigateToPos(e.clientX, e.clientY);
    },
    [navigateToPos, isDragging]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (elements.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const handleMouseMove = (ev: MouseEvent) => {
        navigateToPos(ev.clientX, ev.clientY);
      };
      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [elements, navigateToPos]
  );

  return (
    <div
      className={`minimap-wrapper${isDragging ? " minimap-dragging" : ""}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
