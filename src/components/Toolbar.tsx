import useAppStore from "../store/useAppStore";
import type { Tool } from "../types";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "select", label: "Select (V)", icon: "↖" },
  { id: "hand", label: "Hand (H)", icon: "✋" },
  { id: "rectangle", label: "Rectangle (R)", icon: "▭" },
  { id: "ellipse", label: "Ellipse (E)", icon: "◯" },
  { id: "diamond", label: "Diamond (D)", icon: "◇" },
  { id: "line", label: "Line (L)", icon: "╱" },
  { id: "arrow", label: "Arrow (A)", icon: "→" },
  { id: "freehand", label: "Freehand (P)", icon: "✎" },
  { id: "highlight", label: "Highlight (G)", icon: "🖍" },
  { id: "text", label: "Text (T)", icon: "T" },
  { id: "note", label: "Note (N)", icon: "📝" },
  { id: "mermaid", label: "Mermaid (M)", icon: "⌥" },
];

const C4_TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "c4-person", label: "Person (1)", icon: "🧑" },
  { id: "c4-software-system", label: "Software System (2)", icon: "⬜" },
  { id: "c4-container", label: "Container (3)", icon: "📦" },
  { id: "c4-component", label: "Component (4)", icon: "⚙" },
  { id: "c4-database", label: "Database (5)", icon: "🛢" },
  { id: "c4-system-boundary", label: "System Boundary (6)", icon: "▭" },
  { id: "c4-enterprise-boundary", label: "Enterprise Boundary (7)", icon: "▭" },
  { id: "c4-relationship", label: "Relationship (8)", icon: "⟶" },
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
          <span style={{ fontSize: "18px", lineHeight: 1 }}>{tool.icon}</span>
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
          <span style={{ fontSize: "18px", lineHeight: 1 }}>{tool.icon}</span>
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
