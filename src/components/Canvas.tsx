import { useRef, useEffect, useState, useCallback } from "react";
import useAppStore from "../store/useAppStore";
import { useCanvasEvents } from "../hooks/useCanvasEvents";
import { renderElements, renderSelectionBox } from "../utils/rendering";
import { measureText, pointInElement } from "../utils/geometry";
import { parseMermaidCode, renderMermaidDiagram } from "../utils/mermaid";
import { DEFAULT_FONT_FAMILY } from "../utils/constants";
import { generateId, generateSeed } from "../utils/ids";
import type { MermaidElement } from "../types";
import ZoomControls from "./ZoomControls";
import Minimap from "./Minimap";

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const elements = useAppStore((s) => s.elements);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const viewTransform = useAppStore((s) => s.viewTransform);
  const activeTool = useAppStore((s) => s.activeTool);
  const isDrawing = useAppStore((s) => s.isDrawing);
  const showTextInput = useAppStore((s) => s.showTextInput);
  const showMermaidInput = useAppStore((s) => s.showMermaidInput);
  const setShowTextInput = useAppStore((s) => s.setShowTextInput);
  const setShowMermaidInput = useAppStore((s) => s.setShowMermaidInput);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const { tempElementRef, selectionBoxRef } = useCanvasEvents(canvasRef);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

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
  }, []);

  // Render loop
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const allElements = tempElementRef.current
        ? [...elements, tempElementRef.current]
        : elements;

      renderElements(ctx, allElements, selectedIds, viewTransform);

      const box = selectionBoxRef.current;
      if (box && (box.width > 0 || box.height > 0)) {
        renderSelectionBox(ctx, box, viewTransform);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [elements, selectedIds, viewTransform, isDrawing, tempElementRef, selectionBoxRef]);

  // Cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cursors: Record<string, string> = {
      select: "default",
      hand: "grab",
      rectangle: "crosshair",
      ellipse: "crosshair",
      diamond: "crosshair",
      line: "crosshair",
      arrow: "crosshair",
      freehand: "crosshair",
      text: "text",
      mermaid: "crosshair",
    };

    canvas.style.cursor = cursors[activeTool] || "default";
  }, [activeTool]);

  // Track cursor position for readout
  const handleMouseMoveForReadout = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewTransform.x) / viewTransform.zoom;
      const y = (e.clientY - rect.top - viewTransform.y) / viewTransform.zoom;
      setCursorPos({ x: Math.round(x), y: Math.round(y) });
    },
    [viewTransform]
  );

  const handleTextInputSubmit = (text: string) => {
    if (!showTextInput || !text.trim()) {
      setShowTextInput(null);
      return;
    }

    const state = useAppStore.getState();
    const el: any = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: "text",
      x: showTextInput.x,
      y: showTextInput.y,
      width: 0,
      height: 0,
      strokeColor: state.strokeColor,
      fillColor: "transparent",
      fillStyle: state.fillStyle,
      strokeStyle: state.strokeStyle,
      strokeWidth: state.strokeWidth,
      roughness: state.roughness,
      opacity: state.opacity,
      rotation: 0,
      seed: Math.floor(Math.random() * 2 ** 31),
      text,
      fontSize: state.fontSize,
      fontFamily: DEFAULT_FONT_FAMILY,
    };

    const measured = measureText(text, state.fontSize);
    el.width = measured.width;
    el.height = measured.height;

    state.pushHistory();
    state.addElement(el);
    setShowTextInput(null);
  };

  const handleMermaidInputSubmit = async (code: string, editId?: string) => {
    if (!showMermaidInput || !code.trim()) {
      setShowMermaidInput(null);
      return;
    }

    const isValid = await parseMermaidCode(code);
    if (!isValid) {
      alert("Geçersiz Mermaid kodu. Lütfen flowchart, sequence veya state diagram syntax'ını kontrol edin.");
      return;
    }

    try {
      const result = await renderMermaidDiagram(code);
      const state = useAppStore.getState();

      const el: MermaidElement = {
        id: editId || generateId(),
        type: "mermaid",
        x: showMermaidInput.x,
        y: showMermaidInput.y,
        width: result.width,
        height: result.height,
        strokeColor: state.strokeColor,
        fillColor: state.fillColor,
        fillStyle: state.fillStyle,
        strokeStyle: state.strokeStyle,
        strokeWidth: state.strokeWidth,
        roughness: state.roughness,
        opacity: state.opacity,
        rotation: 0,
        seed: generateSeed(),
        code,
        renderedNodes: result.nodes,
        renderedEdges: result.edges,
        originalWidth: result.width,
        originalHeight: result.height,
      };

      state.pushHistory();
      if (editId) {
        state.updateElement(editId, el as any);
      } else {
        state.addElement(el);
      }
      setShowMermaidInput(null);
    } catch (err) {
      alert("Mermaid render hatası: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const state = useAppStore.getState();
      const x = (e.clientX - rect.left - state.viewTransform.x) / state.viewTransform.zoom;
      const y = (e.clientY - rect.top - state.viewTransform.y) / state.viewTransform.zoom;

      for (const el of [...state.elements].reverse()) {
        if (el.type === "mermaid" && pointInElement(x, y, el)) {
          const mermaidEl = el as MermaidElement;
          state.setShowMermaidInput({
            x: mermaidEl.x,
            y: mermaidEl.y,
            screenX: e.clientX,
            screenY: e.clientY,
            editId: mermaidEl.id,
          });
          return;
        }
      }
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="canvas-wrapper"
      onMouseMove={handleMouseMoveForReadout}
      onMouseLeave={() => setCursorPos(null)}
      onDoubleClick={handleCanvasDoubleClick}
    >
      <canvas ref={canvasRef} />
      {showTextInput && (
        <TextInputOverlay
          x={showTextInput.screenX}
          y={showTextInput.screenY}
          onSubmit={handleTextInputSubmit}
          onCancel={() => setShowTextInput(null)}
        />
      )}
      {showMermaidInput && (
        <MermaidInputOverlay
          x={showMermaidInput.screenX}
          y={showMermaidInput.screenY}
          initialCode={
            showMermaidInput.editId
              ? (useAppStore.getState().elements.find(
                  (e) => e.id === showMermaidInput!.editId
                ) as MermaidElement | undefined)?.code || ""
              : ""
          }
          onSubmit={(code) => handleMermaidInputSubmit(code, showMermaidInput.editId)}
          onCancel={() => setShowMermaidInput(null)}
        />
      )}

      <Minimap />

      <div className="coord-readout">
        {cursorPos
          ? `${cursorPos.x}, ${cursorPos.y}`
          : "\u00A0"
        }
        {" \u00B7 "}
        {Math.round(viewTransform.zoom * 100)}%
      </div>

      <ZoomControls />
    </div>
  );
}

function TextInputOverlay({
  x,
  y,
  onSubmit,
  onCancel,
}: {
  x: number;
  y: number;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fontSize = useAppStore((s) => s.fontSize);

  useEffect(() => {
    requestAnimationFrame(() => {
      ref.current?.focus();
    });
  }, []);

  return (
    <textarea
      ref={ref}
      className="text-input-overlay"
      style={{
        left: x,
        top: y,
        fontSize: `${fontSize}px`,
      }}
      onBlur={(e) => {
        if (e.target.value.trim()) {
          onSubmit(e.target.value);
        } else {
          onCancel();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit(ref.current?.value || "");
        }
      }}
    />
  );
}

function MermaidInputOverlay({
  x,
  y,
  initialCode,
  onSubmit,
  onCancel,
}: {
  x: number;
  y: number;
  initialCode: string;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      ref.current?.focus();
    });
  }, []);

  return (
    <div className="mermaid-input-overlay" style={{ left: x, top: y }}>
      <div className="mermaid-input-header">Mermaid Diagram</div>
      <textarea
        ref={ref}
        className="mermaid-input-textarea"
        defaultValue={initialCode || "flowchart TD\n    A[Start] --> B[End]"}
        placeholder={"flowchart TD\n    A[Start] --> B[End]\n\nor sequence diagram:\n\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi\n\nor state diagram:\n\nstateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n    Still --> Moving\n    Moving --> Still"}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSubmit(ref.current?.value || "");
          }
        }}
      />
      <div className="mermaid-input-footer">
        <button
          className="mermaid-input-btn"
          onClick={() => onSubmit(ref.current?.value || "")}
        >
          Render
        </button>
        <button
          className="mermaid-input-btn mermaid-input-btn-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <span className="mermaid-input-hint">Ctrl+Enter to render</span>
      </div>
    </div>
  );
}
