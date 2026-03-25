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

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select (V)", icon: "↖" },
  { id: "hand", label: "Hand (H)", icon: "✋" },
  { id: "rectangle", label: "Rectangle (R)", icon: "▭" },
  { id: "ellipse", label: "Ellipse (E)", icon: "◯" },
  { id: "diamond", label: "Diamond (D)", icon: "◇" },
  { id: "line", label: "Line (L)", icon: "╱" },
  { id: "arrow", label: "Arrow (A)", icon: "→" },
  { id: "freehand", label: "Freehand (P)", icon: "✎" },
  { id: "highlight", label: "Highlight (G)", icon: <HighlightIcon /> },
  { id: "text", label: "Text (T)", icon: "T" },
  { id: "note", label: "Note (N)", icon: <NoteIcon /> },
  { id: "mermaid", label: "Mermaid (M)", icon: "⌥" },
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

export default function Toolbar() {
  const activeTool = useAppStore((s) => s.activeTool);
  const setTool = useAppStore((s) => s.setTool);
  const showGrid = useAppStore((s) => s.showGrid);
  const toggleGrid = useAppStore((s) => s.toggleGrid);

  return (
    <div className="toolbar">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
          onClick={() => setTool(tool.id)}
          title={tool.label}
        >
          {typeof tool.icon === "string" ? (
            <span style={{ fontSize: "18px", lineHeight: 1 }}>{tool.icon}</span>
          ) : (
            tool.icon
          )}
        </button>
      ))}
      <span
        style={{
          width: 1,
          height: 24,
          background: "var(--border-primary)",
          margin: "0 4px",
          flexShrink: 0,
        }}
      />
      {C4_TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={`tool-btn ${activeTool === tool.id ? "active" : ""}`}
          onClick={() => setTool(tool.id)}
          title={tool.label}
        >
          {typeof tool.icon === "string" ? (
            <span style={{ fontSize: "18px", lineHeight: 1 }}>{tool.icon}</span>
          ) : (
            tool.icon
          )}
        </button>
      ))}
      <span
        style={{
          width: 1,
          height: 24,
          background: "var(--border-primary)",
          margin: "0 4px",
          flexShrink: 0,
        }}
      />
      <button
        className={`tool-btn ${showGrid ? "active" : ""}`}
        onClick={toggleGrid}
        title="Toggle Grid"
      >
        <span style={{ fontSize: "16px", lineHeight: 1 }}>⊞</span>
      </button>
    </div>
  );
}
