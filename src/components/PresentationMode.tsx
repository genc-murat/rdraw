import { useRef, useEffect, useState, useCallback } from "react";
import useAppStore from "../store/useAppStore";
import { renderElements } from "../utils/rendering";
import { getElementBounds } from "../utils/geometry";
import type { DrawElement, ViewTransform } from "../types";

function computeAutoFitTransform(
  elements: DrawElement[],
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 40
): ViewTransform {
  if (elements.length === 0) {
    return { x: viewportWidth / 2, y: viewportHeight / 2, zoom: 1 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const bounds = getElementBounds(el);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  if (contentWidth <= 0 || contentHeight <= 0) {
    return {
      x: viewportWidth / 2 - minX,
      y: viewportHeight / 2 - minY,
      zoom: 1,
    };
  }

  const availableWidth = viewportWidth - padding * 2;
  const availableHeight = viewportHeight - padding * 2;
  const zoom = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);

  const scaledWidth = contentWidth * zoom;
  const scaledHeight = contentHeight * zoom;
  const offsetX = (viewportWidth - scaledWidth) / 2 - minX * zoom;
  const offsetY = (viewportHeight - scaledHeight) / 2 - minY * zoom;

  return { x: offsetX, y: offsetY, zoom };
}

export default function PresentationMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideIndexRef = useRef(0);

  const presentationMode = useAppStore((s) => s.presentationMode);
  const elements = useAppStore((s) => s.elements);
  const pages = useAppStore((s) => s.pages);
  const activePageId = useAppStore((s) => s.activePageId);
  const theme = useAppStore((s) => s.theme);
  const exitPresentation = useAppStore((s) => s.exitPresentation);
  const nextSlide = useAppStore((s) => s.nextSlide);
  const prevSlide = useAppStore((s) => s.prevSlide);

  const [barVisible, setBarVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const pageIndex = pages.findIndex((p) => p.id === activePageId);
  slideIndexRef.current = pageIndex >= 0 ? pageIndex : 0;

  const showBar = useCallback(() => {
    setBarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setBarVisible(false), 2000);
  }, []);

  useEffect(() => {
    showBar();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [activePageId, showBar]);

  // Canvas resize
  useEffect(() => {
    if (!presentationMode) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [presentationMode]);

  // Render loop
  useEffect(() => {
    if (!presentationMode) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let needsRender = true;

    const render = () => {
      if (!running) return;

      if (needsRender) {
        needsRender = false;

        const dpr = window.devicePixelRatio || 1;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const currentElements = useAppStore.getState().elements;
        const viewTransform = computeAutoFitTransform(currentElements, width, height);

        renderElements(
          ctx,
          currentElements,
          [],
          viewTransform,
          false,
          theme
        );
      }

      if (running) {
        requestAnimationFrame(render);
      }
    };

    needsRender = true;
    const frame = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, [presentationMode, elements, theme]);

  // Keyboard and click navigation
  useEffect(() => {
    if (!presentationMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        exitPresentation();
      } else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        prevSlide();
      }

      showBar();
    };

    const handleClick = (e: MouseEvent) => {
      const width = window.innerWidth;
      if (e.clientX > width / 2) {
        nextSlide();
      } else {
        prevSlide();
      }
      showBar();
    };

    const handleMouseMove = () => {
      showBar();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("click", handleClick);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [presentationMode, exitPresentation, nextSlide, prevSlide, showBar]);

  if (!presentationMode) return null;

  const pageCount = pages.length;
  const currentPage = pageIndex >= 0 ? pageIndex + 1 : 1;

  return (
    <div ref={containerRef} className="presentation-overlay" style={{ background: "var(--canvas-bg)" }}>
      <canvas ref={canvasRef} />
      <div className={`presentation-bar ${barVisible ? "presentation-bar-visible" : ""}`}>
        <span className="presentation-page-indicator">
          {currentPage} / {pageCount}
        </span>
        <button className="presentation-exit-btn" onClick={exitPresentation}>
          Exit (Esc)
        </button>
      </div>
    </div>
  );
}
