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
  { id: "text", label: "Text (T)", icon: "T" },
  { id: "mermaid", label: "Mermaid (M)", icon: "⌥" },
];

export default function Toolbar() {
  const activeTool = useAppStore((s) => s.activeTool);
  const setTool = useAppStore((s) => s.setTool);

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
    </div>
  );
}
