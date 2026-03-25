import { useCallback, useRef } from "react";
import useAppStore from "../store/useAppStore";
import type { Tool } from "../types";

type ToolDef = { id: Tool; label: string; icon: React.ReactNode };

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" />
    <path d="M12 8v4m-4 4h8l-2-4H10l-2 4z" />
  </svg>
);

const SystemIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
  </svg>
);

const ContainerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M8 5v14m8-14v14" />
  </svg>
);

const ComponentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2l2.8 2.8M18.4 5.6l-2.8 2.8m-7.2 7.2l-2.8 2.8" />
  </svg>
);

const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6m-16 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
  </svg>
);

const BoundaryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" strokeDasharray="4 2" />
  </svg>
);

const EnterpriseBoundaryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="22" height="18" rx="2" strokeDasharray="6 2" />
  </svg>
);

const RelationshipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h14" />
    <path d="M15 8l4 4-4 4" />
  </svg>
);

const CalloutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="13" rx="2" />
    <polygon points="8,16 12,22 16,16" fill="currentColor" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
  </svg>
);

const HexagonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />
  </svg>
);

const RoundedRectangleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="4" />
  </svg>
);

const HighlightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" />
    <path d="M12.5 7.5l4 4" />
  </svg>
);

const NoteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
    <path d="M14 2v6h6m-4 5H8m8 4H8m4-8H8" />
  </svg>
);

const RotateIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8a6 6 0 0111.3-2.5" />
    <path d="M14 8a6 6 0 01-11.3 2.5" />
    <path d="M13.3 3v3h-3" />
    <path d="M2.7 13v-3h3" />
  </svg>
);

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select (V)", icon: "\u2196" },
  { id: "hand", label: "Hand (H)", icon: "\u270B" },
  { id: "rectangle", label: "Rectangle (R)", icon: "\u25AD" },
  { id: "rounded-rectangle", label: "Rounded Rect (Shift+R)", icon: <RoundedRectangleIcon /> },
  { id: "ellipse", label: "Ellipse (E)", icon: "\u25EF" },
  { id: "diamond", label: "Diamond (D)", icon: "\u25C7" },
  { id: "star", label: "Star (S)", icon: <StarIcon /> },
  { id: "hexagon", label: "Hexagon (X)", icon: <HexagonIcon /> },
  { id: "line", label: "Line (L)", icon: "\u2571" },
  { id: "arrow", label: "Arrow (A)", icon: "\u2192" },
  { id: "freehand", label: "Freehand (P)", icon: "\u270E" },
  { id: "highlight", label: "Highlight (G)", icon: <HighlightIcon /> },
  { id: "text", label: "Text (T)", icon: "T" },
  { id: "note", label: "Note (N)", icon: <NoteIcon /> },
  { id: "callout", label: "Callout (C)", icon: <CalloutIcon /> },
  { id: "mermaid", label: "Mermaid (M)", icon: "\u2325" },
];

const C4_TOOLS: ToolDef[] = [
  { id: "c4-person", label: "Person (1)", icon: <PersonIcon /> },
  { id: "c4-software-system", label: "Software System (2)", icon: <SystemIcon /> },
  { id: "c4-container", label: "Container (3)", icon: <ContainerIcon /> },
  { id: "c4-component", label: "Component (4)", icon: <ComponentIcon /> },
  { id: "c4-database", label: "Database (5)", icon: <DatabaseIcon /> },
  { id: "c4-system-boundary", label: "System Boundary (6)", icon: <BoundaryIcon /> },
  { id: "c4-enterprise-boundary", label: "Enterprise Boundary (7)", icon: <EnterpriseBoundaryIcon /> },
  { id: "c4-relationship", label: "Relationship (8)", icon: <RelationshipIcon /> },
];

function renderIcon(icon: React.ReactNode) {
  return typeof icon === "string" ? (
    <span style={{ fontSize: "18px", lineHeight: 1 }}>{icon}</span>
  ) : (
    icon
  );
}

export default function Toolbar() {
  const activeTool = useAppStore((s) => s.activeTool);
  const setTool = useAppStore((s) => s.setTool);
  const showGrid = useAppStore((s) => s.showGrid);
  const toggleGrid = useAppStore((s) => s.toggleGrid);
  const orientation = useAppStore((s) => s.toolbarOrientation);
  const position = useAppStore((s) => s.toolbarPosition);
  const toggleOrientation = useAppStore((s) => s.toggleToolbarOrientation);
  const setPosition = useAppStore((s) => s.setToolbarPosition);

  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      dragRef.current = {
        offsetX: e.clientX - position.x,
        offsetY: e.clientY - position.y,
      };

      const toolbar = e.currentTarget as HTMLElement;
      toolbar.classList.add("dragging");

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        setPosition({
          x: ev.clientX - dragRef.current.offsetX,
          y: ev.clientY - dragRef.current.offsetY,
        });
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        toolbar.classList.remove("dragging");
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [position, setPosition]
  );

  return (
    <div
      className={`toolbar${orientation === "vertical" ? " toolbar-vertical" : ""}`}
      style={{ position: "absolute", left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
          onClick={() => setTool(tool.id)}
          title={tool.label}
        >
          {renderIcon(tool.icon)}
        </button>
      ))}
      <span className="toolbar-separator" />
      {C4_TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
          onClick={() => setTool(tool.id)}
          title={tool.label}
        >
          {renderIcon(tool.icon)}
        </button>
      ))}
      <span className="toolbar-separator" />
      <button
        className={`tool-btn ${showGrid ? "active" : ""}`}
        onClick={toggleGrid}
        title="Toggle Grid"
      >
        <span style={{ fontSize: "16px", lineHeight: 1 }}>{"\u229E"}</span>
      </button>
      <span className="toolbar-separator" />
      <button
        className="toolbar-rotate-btn"
        onClick={toggleOrientation}
        title={`Switch to ${orientation === "horizontal" ? "vertical" : "horizontal"}`}
      >
        <RotateIcon />
      </button>
    </div>
  );
}
