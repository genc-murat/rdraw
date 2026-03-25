import useAppStore from "../store/useAppStore";
import type { FillStyle, StrokeStyle } from "../types";
import ColorPicker from "./ColorPicker";
import { HIGHLIGHT_COLORS } from "../utils/constants";

export default function PropertiesPanel({ open = true }: { open?: boolean }) {
  const strokeColor = useAppStore((s) => s.strokeColor);
  const fillColor = useAppStore((s) => s.fillColor);
  const fillStyle = useAppStore((s) => s.fillStyle);
  const strokeStyle = useAppStore((s) => s.strokeStyle);
  const strokeWidth = useAppStore((s) => s.strokeWidth);
  const roughness = useAppStore((s) => s.roughness);
  const opacity = useAppStore((s) => s.opacity);
  const fontSize = useAppStore((s) => s.fontSize);
  const activeTool = useAppStore((s) => s.activeTool);

  const setStrokeColor = useAppStore((s) => s.setStrokeColor);
  const setFillColor = useAppStore((s) => s.setFillColor);
  const setFillStyle = useAppStore((s) => s.setFillStyle);
  const setStrokeStyle = useAppStore((s) => s.setStrokeStyle);
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth);
  const setRoughness = useAppStore((s) => s.setRoughness);
  const setOpacity = useAppStore((s) => s.setOpacity);
  const setFontSize = useAppStore((s) => s.setFontSize);

  return (
    <div className={`properties-panel${open ? "" : " properties-panel-closed"}`}>
      {activeTool === "highlight" && (
        <div className="prop-group">
          <h3>Highlight Color</h3>
          <div className="prop-row" style={{ gap: 6, flexWrap: "wrap" }}>
            {HIGHLIGHT_COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch${strokeColor === c ? " selected" : ""}`}
                style={{ background: c, width: 28, height: 28, cursor: "pointer", borderRadius: 4 }}
                onClick={() => setStrokeColor(c)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="prop-group">
        <h3>Colors</h3>
        <ColorPicker color={strokeColor} onChange={setStrokeColor} label="Stroke" />
        <ColorPicker color={fillColor} onChange={setFillColor} label="Fill" />
      </div>

      <div className="prop-group">
        <h3>Fill Style</h3>
        <div className="prop-row">
          <select
            className="prop-select"
            value={fillStyle}
            onChange={(e) => setFillStyle(e.target.value as FillStyle)}
          >
            <option value="none">None</option>
            <option value="solid">Solid</option>
            <option value="hachure">Hachure</option>
            <option value="cross-hatch">Cross-hatch</option>
          </select>
        </div>
      </div>

      <div className="prop-group">
        <h3>Stroke</h3>
        <div className="prop-row">
          <span className="prop-label">Width</span>
          <input
            className="prop-input"
            type="number"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Style</span>
          <select
            className="prop-select"
            value={strokeStyle}
            onChange={(e) => setStrokeStyle(e.target.value as StrokeStyle)}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
      </div>

      <div className="prop-group">
        <h3>Appearance</h3>
        <div className="prop-row">
          <span className="prop-label">Roughness</span>
          <input
            className="prop-input"
            type="number"
            min={0}
            max={5}
            step={0.5}
            value={roughness}
            onChange={(e) => setRoughness(Number(e.target.value))}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Opacity</span>
          <input
            className="prop-input"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
          <span style={{ fontSize: 12, color: "#aaa", minWidth: 36 }}>
            {Math.round(opacity * 100)}%
          </span>
        </div>
      </div>

      <div className="prop-group">
        <h3>Text</h3>
        <div className="prop-row">
          <span className="prop-label">Size</span>
          <input
            className="prop-input"
            type="number"
            min={8}
            max={200}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
