import { useRef, useCallback, useEffect } from "react";
import useAppStore from "../store/useAppStore";
import { generateId, generateSeed } from "../utils/ids";
import { screenToCanvas, pointInElement, getResizeHandle, getElementBounds, getNoteCloneHandle } from "../utils/geometry";
import { DEFAULT_NOTE_FONT_SIZE, DEFAULT_FONT_FAMILY } from "../utils/constants";
import type { DrawElement, ShapeElement, LineElement, FreehandElement, NoteElement } from "../types";

const CLAMP_COORDINATE = 1e7;

function clampViewTransform(vt: { x: number; y: number; zoom: number }): { x: number; y: number; zoom: number } {
  return {
    x: Math.max(-CLAMP_COORDINATE, Math.min(CLAMP_COORDINATE, vt.x)),
    y: Math.max(-CLAMP_COORDINATE, Math.min(CLAMP_COORDINATE, vt.y)),
    zoom: Math.max(0.1, Math.min(10, vt.zoom)),
  };
}

const spaceDownRef = { current: false };

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useCanvasEvents(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const store = useAppStore;
  const tempElementRef = useRef<DrawElement | null>(null);
  const resizeHandleRef = useRef<string | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; bounds: any } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; elements: { id: string; x: number; y: number }[] } | null>(null);
  const selectionBoxRef = useRef<SelectionBox | null>(null);
  const selectionBoxStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.code === "Space") spaceDownRef.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") spaceDownRef.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const getCanvasPoint = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const state = store.getState();
    return screenToCanvas(e.clientX, e.clientY, state.viewTransform, rect);
  }, [canvasRef]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && spaceDownRef.current) || (e.button === 0 && store.getState().activeTool === "hand")) {
        store.getState().setIsPanning(true);
        store.getState().setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (e.button !== 0) return;

      const state = store.getState();
      const point = getCanvasPoint(e);

      if (state.activeTool === "select") {
        for (const id of state.selectedIds) {
          const el = state.elements.find((e) => e.id === id);
          if (el) {
            const handle = getResizeHandle(point.x, point.y, el, state.viewTransform.zoom);
            if (handle) {
              resizeHandleRef.current = handle;
              resizeStartRef.current = {
                x: point.x,
                y: point.y,
                bounds: getElementBounds(el),
              };
              state.pushHistory();
              return;
            }

            // Check clone handles for note elements
            if (el.type === "note") {
              const cloneHandle = getNoteCloneHandle(point.x, point.y, el, state.viewTransform.zoom);
              if (cloneHandle) {
                const bounds = getElementBounds(el);
                let newX: number, newY: number;
                const gap = 20;
                if (cloneHandle === "right") {
                  newX = bounds.x + bounds.width + gap;
                  newY = bounds.y;
                } else {
                  newX = bounds.x;
                  newY = bounds.y + bounds.height + gap;
                }
                const newNote: NoteElement = {
                  id: generateId(),
                  type: "note",
                  x: newX,
                  y: newY,
                  width: el.width,
                  height: el.height,
                  strokeColor: el.strokeColor,
                  fillColor: el.fillColor,
                  fillStyle: el.fillStyle,
                  strokeStyle: el.strokeStyle,
                  strokeWidth: el.strokeWidth,
                  roughness: el.roughness,
                  opacity: el.opacity,
                  rotation: 0,
                  seed: generateSeed(),
                  text: "",
                  fontSize: (el as NoteElement).fontSize,
                  fontFamily: (el as NoteElement).fontFamily,
                };
                state.pushHistory();
                state.addElement(newNote);
                state.selectElement(newNote.id);
                // Show text input for the new note
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  state.setShowTextInput({
                    x: newX,
                    y: newY,
                    screenX: newX * state.viewTransform.zoom + state.viewTransform.x + rect.left,
                    screenY: newY * state.viewTransform.zoom + state.viewTransform.y + rect.top,
                    editId: newNote.id,
                  });
                }
                return;
              }
            }
          }
        }

        const hitElement = [...state.elements].reverse().find((el) =>
          pointInElement(point.x, point.y, el)
        );

        if (hitElement) {
          state.selectElement(hitElement.id, e.shiftKey);
          dragStartRef.current = {
            x: point.x,
            y: point.y,
            elements: state.selectedIds.map((id) => {
              const el = state.elements.find((e) => e.id === id)!;
              return { id, x: el.x, y: el.y };
            }),
          };
          state.pushHistory();
        } else {
          if (!e.shiftKey) state.clearSelection();
          selectionBoxStartRef.current = { x: point.x, y: point.y };
          selectionBoxRef.current = { x: point.x, y: point.y, width: 0, height: 0 };
        }
        return;
      }

      if (state.activeTool === "text") {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          state.setShowTextInput({
            x: point.x,
            y: point.y,
            screenX: point.x * state.viewTransform.zoom + state.viewTransform.x + rect.left,
            screenY: point.y * state.viewTransform.zoom + state.viewTransform.y + rect.top,
          });
        }
        return;
      }

      if (state.activeTool === "mermaid") {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          state.setShowMermaidInput({
            x: point.x,
            y: point.y,
            screenX: point.x * state.viewTransform.zoom + state.viewTransform.x + rect.left,
            screenY: point.y * state.viewTransform.zoom + state.viewTransform.y + rect.top,
          });
        }
        return;
      }

      if (state.activeTool === "note") {
        state.pushHistory();
        state.setIsDrawing(true);
        state.setDrawStart({ x: point.x, y: point.y });
        const el: NoteElement = {
          id: generateId(),
          type: "note",
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          strokeColor: state.strokeColor,
          fillColor: state.fillColor,
          fillStyle: state.fillStyle,
          strokeStyle: state.strokeStyle,
          strokeWidth: state.strokeWidth,
          roughness: state.roughness,
          opacity: state.opacity,
          rotation: 0,
          seed: generateSeed(),
          text: "",
          fontSize: state.fontSize || DEFAULT_NOTE_FONT_SIZE,
          fontFamily: DEFAULT_FONT_FAMILY,
        };
        tempElementRef.current = el;
        return;
      }

      state.pushHistory();
      state.setIsDrawing(true);
      state.setDrawStart({ x: point.x, y: point.y });

      if (state.activeTool === "rectangle" || state.activeTool === "ellipse" || state.activeTool === "diamond") {
        const el: ShapeElement = {
          id: generateId(),
          type: state.activeTool,
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          strokeColor: state.strokeColor,
          fillColor: state.fillColor,
          fillStyle: state.fillStyle,
          strokeStyle: state.strokeStyle,
          strokeWidth: state.strokeWidth,
          roughness: state.roughness,
          opacity: state.opacity,
          rotation: 0,
          seed: generateSeed(),
        };
        tempElementRef.current = el;
      } else if (state.activeTool === "line" || state.activeTool === "arrow") {
        const el: LineElement = {
          id: generateId(),
          type: state.activeTool,
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          strokeColor: state.strokeColor,
          fillColor: state.fillColor,
          fillStyle: state.fillStyle,
          strokeStyle: state.strokeStyle,
          strokeWidth: state.strokeWidth,
          roughness: state.roughness,
          opacity: state.opacity,
          rotation: 0,
          seed: generateSeed(),
          points: [[0, 0], [0, 0]],
          endArrowhead: state.activeTool === "arrow",
          startArrowhead: false,
        };
        tempElementRef.current = el;
      } else if (state.activeTool === "freehand" || state.activeTool === "highlight") {
        const el: FreehandElement = {
          id: generateId(),
          type: "freehand",
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          strokeColor: state.strokeColor,
          fillColor: state.fillColor,
          fillStyle: state.fillStyle,
          strokeStyle: state.strokeStyle,
          strokeWidth: state.strokeWidth,
          roughness: state.roughness,
          opacity: state.opacity,
          rotation: 0,
          seed: generateSeed(),
          points: [[0, 0]],
        };
        tempElementRef.current = el;
      }
    },
    [getCanvasPoint, canvasRef]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const state = store.getState();

      if (state.isPanning && state.panStart) {
        const dx = e.clientX - state.panStart.x;
        const dy = e.clientY - state.panStart.y;
        store.getState().setViewTransform(clampViewTransform({
          ...state.viewTransform,
          x: state.viewTransform.x + dx,
          y: state.viewTransform.y + dy,
        }));
        state.setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      const point = getCanvasPoint(e);

      if (resizeHandleRef.current && resizeStartRef.current && state.selectedIds.length === 1) {
        const handle = resizeHandleRef.current;
        const start = resizeStartRef.current;
        const dx = point.x - start.x;
        const dy = point.y - start.y;
        const bounds = start.bounds;

        let newX = bounds.x;
        let newY = bounds.y;
        let newW = bounds.width;
        let newH = bounds.height;

        if (handle.includes("e")) newW = bounds.width + dx;
        if (handle.includes("w")) { newX = bounds.x + dx; newW = bounds.width - dx; }
        if (handle.includes("s")) newH = bounds.height + dy;
        if (handle.includes("n")) { newY = bounds.y + dy; newH = bounds.height - dy; }

        if (e.shiftKey) {
          const ratio = bounds.width / bounds.height || 1;
          if (Math.abs(newW) > Math.abs(newH * ratio)) {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }
        }

        newW = Math.max(1, newW);
        newH = Math.max(1, newH);

        state.updateElement(state.selectedIds[0], {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        } as any);
        return;
      }

      if (dragStartRef.current) {
        const dx = point.x - dragStartRef.current.x;
        const dy = point.y - dragStartRef.current.y;
        for (const { id, x, y } of dragStartRef.current.elements) {
          state.updateElement(id, { x: x + dx, y: y + dy } as any);
        }
        return;
      }

      if (selectionBoxStartRef.current) {
        const start = selectionBoxStartRef.current;
        const x = Math.min(start.x, point.x);
        const y = Math.min(start.y, point.y);
        const width = Math.abs(point.x - start.x);
        const height = Math.abs(point.y - start.y);
        selectionBoxRef.current = { x, y, width, height };
        return;
      }

      if (!state.isDrawing || !tempElementRef.current) return;

      const start = state.drawStart;
      if (!start) return;

      if (tempElementRef.current.type === "rectangle" || tempElementRef.current.type === "ellipse" || tempElementRef.current.type === "diamond" || tempElementRef.current.type === "note") {
        let x = start.x;
        let y = start.y;
        let w = point.x - start.x;
        let h = point.y - start.y;

        if (e.altKey) {
          w = point.x - start.x;
          h = point.y - start.y;
        } else {
          if (w < 0) { x = point.x; w = -w; }
          if (h < 0) { y = point.y; h = -h; }
        }

        if (e.shiftKey) {
          const size = Math.max(Math.abs(w), Math.abs(h));
          w = w < 0 ? -size : size;
          h = h < 0 ? -size : size;
        }

        tempElementRef.current = {
          ...tempElementRef.current,
          x,
          y,
          width: Math.abs(w),
          height: Math.abs(h),
        } as ShapeElement;
      } else if (tempElementRef.current.type === "line" || tempElementRef.current.type === "arrow") {
        let dx = point.x - start.x;
        let dy = point.y - start.y;

        if (e.shiftKey) {
          const angle = Math.atan2(dy, dx);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const len = Math.sqrt(dx * dx + dy * dy);
          dx = Math.cos(snappedAngle) * len;
          dy = Math.sin(snappedAngle) * len;
        }

        const el = tempElementRef.current as LineElement;
        tempElementRef.current = {
          ...el,
          points: [[0, 0], [dx, dy]],
        } as LineElement;
      } else if (tempElementRef.current.type === "freehand") {
        const el = tempElementRef.current as FreehandElement;
        const newPoint: [number, number] = [point.x - start.x, point.y - start.y];
        const lastPoint = el.points[el.points.length - 1];
        const dx = newPoint[0] - lastPoint[0];
        const dy = newPoint[1] - lastPoint[1];
        if (dx * dx + dy * dy >= 16) {
          el.points.push(newPoint);
        }
      }
    },
    [getCanvasPoint]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const state = store.getState();

      if (state.isPanning) {
        state.setIsPanning(false);
        state.setPanStart(null);
        return;
      }

      if (resizeHandleRef.current) {
        resizeHandleRef.current = null;
        resizeStartRef.current = null;
        return;
      }

      if (dragStartRef.current) {
        dragStartRef.current = null;
        return;
      }

      if (selectionBoxStartRef.current && selectionBoxRef.current) {
        const box = selectionBoxRef.current;
        if (box.width > 5 || box.height > 5) {
          const selectedIds: string[] = [];
          for (const el of state.elements) {
            const bounds = getElementBounds(el);
            if (
              bounds.x >= box.x &&
              bounds.y >= box.y &&
              bounds.x + bounds.width <= box.x + box.width &&
              bounds.y + bounds.height <= box.y + box.height
            ) {
              selectedIds.push(el.id);
            }
          }
          useAppStore.setState({ selectedIds });
        }
        selectionBoxStartRef.current = null;
        selectionBoxRef.current = null;
        return;
      }

      if (!state.isDrawing || !tempElementRef.current) return;

      const el = tempElementRef.current;

      let shouldAdd = true;
      if (el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond") {
        shouldAdd = el.width > 2 || el.height > 2;
      } else if (el.type === "note") {
        shouldAdd = el.width > 5 || el.height > 5;
      } else if (el.type === "line" || el.type === "arrow") {
        const pts = (el as LineElement).points;
        const last = pts[pts.length - 1];
        shouldAdd = Math.abs(last[0]) > 2 || Math.abs(last[1]) > 2;
      } else if (el.type === "freehand") {
        shouldAdd = (el as FreehandElement).points.length > 2;
      }

      if (shouldAdd) {
        state.addElement(el);

        // Show text input for new note elements
        if (el.type === "note") {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            state.setShowTextInput({
              x: el.x,
              y: el.y,
              screenX: el.x * state.viewTransform.zoom + state.viewTransform.x + rect.left,
              screenY: el.y * state.viewTransform.zoom + state.viewTransform.y + rect.top,
              editId: el.id,
            });
          }
        }
      }

      tempElementRef.current = null;
      state.setIsDrawing(false);
      state.setDrawStart(null);
    },
    []
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const state = store.getState();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(10, Math.max(0.1, state.viewTransform.zoom * zoomFactor));

      const newX = mouseX - (mouseX - state.viewTransform.x) * (newZoom / state.viewTransform.zoom);
      const newY = mouseY - (mouseY - state.viewTransform.y) * (newZoom / state.viewTransform.zoom);

      store.getState().setViewTransform(clampViewTransform({ x: newX, y: newY, zoom: newZoom }));
    },
    [canvasRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [canvasRef, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  return { tempElementRef, selectionBoxRef };
}
