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
  { id: "mermaid", label: "Mermaid (M)", icon: "⌥" },
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
