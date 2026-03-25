import { useCallback, useRef } from "react";
import useAppStore from "../store/useAppStore";
import type { FillStyle, StrokeStyle, ArrowheadStyle } from "../types";
import ColorPicker from "./ColorPicker";
import { HIGHLIGHT_COLORS } from "../utils/constants";

function ArrowheadStyleSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ArrowheadStyle;
  onChange: (v: ArrowheadStyle) => void;
}) {
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      <select
        className="prop-select"
        value={value}
        onChange={(e) => onChange(e.target.value as ArrowheadStyle)}
      >
        <option value="none">None</option>
        <option value="arrow">Arrow</option>
        <option value="triangle">Triangle</option>
        <option value="circle">Circle</option>
        <option value="diamond">Diamond</option>
        <option value="bar">Bar</option>
      </select>
    </div>
  );
}

export default function PropertiesPanel() {
  const strokeColor = useAppStore((s) => s.strokeColor);
  const fillColor = useAppStore((s) => s.fillColor);
  const fillStyle = useAppStore((s) => s.fillStyle);
  const strokeStyle = useAppStore((s) => s.strokeStyle);
  const strokeWidth = useAppStore((s) => s.strokeWidth);
  const roughness = useAppStore((s) => s.roughness);
  const opacity = useAppStore((s) => s.opacity);
  const fontSize = useAppStore((s) => s.fontSize);
  const activeTool = useAppStore((s) => s.activeTool);
  const borderRadius = useAppStore((s) => s.borderRadius);
  const endArrowheadStyle = useAppStore((s) => s.endArrowheadStyle);
  const startArrowheadStyle = useAppStore((s) => s.startArrowheadStyle);
  const connectorRouting = useAppStore((s) => s.connectorRouting);
  const panelPosition = useAppStore((s) => s.panelPosition);
  const togglePanel = useAppStore((s) => s.togglePanel);

  const setStrokeColor = useAppStore((s) => s.setStrokeColor);
  const setFillColor = useAppStore((s) => s.setFillColor);
  const setFillStyle = useAppStore((s) => s.setFillStyle);
  const setStrokeStyle = useAppStore((s) => s.setStrokeStyle);
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth);
  const setRoughness = useAppStore((s) => s.setRoughness);
  const setOpacity = useAppStore((s) => s.setOpacity);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setBorderRadius = useAppStore((s) => s.setBorderRadius);
  const setEndArrowheadStyle = useAppStore((s) => s.setEndArrowheadStyle);
  const setStartArrowheadStyle = useAppStore((s) => s.setStartArrowheadStyle);
  const setConnectorRouting = useAppStore((s) => s.setConnectorRouting);
  const setPanelPosition = useAppStore((s) => s.setPanelPosition);

  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      dragRef.current = {
        offsetX: e.clientX - panelPosition.x,
        offsetY: e.clientY - panelPosition.y,
      };

      const panel = e.currentTarget as HTMLElement;
      panel.classList.add("dragging");

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        setPanelPosition({
          x: ev.clientX - dragRef.current.offsetX,
          y: ev.clientY - dragRef.current.offsetY,
        });
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        panel.classList.remove("dragging");
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [panelPosition, setPanelPosition]
  );

  return (
    <div
      className="properties-panel"
      style={{ left: panelPosition.x, top: panelPosition.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="properties-panel-header">
        <h2>Properties</h2>
        <button className="panel-close-btn" onClick={togglePanel} title="Close">
          {"\u2715"}
        </button>
      </div>
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
            <option value="zigzag">Zigzag</option>
            <option value="dots">Dots</option>
            <option value="dashed">Dashed</option>
            <option value="zigzag-line">Zigzag Line</option>
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

      {(activeTool === "arrow" || activeTool === "line" || activeTool === "c4-relationship") && (
        <div className="prop-group">
          <h3>Arrowhead</h3>
          <ArrowheadStyleSelect
            label="Start"
            value={startArrowheadStyle}
            onChange={setStartArrowheadStyle}
          />
          <ArrowheadStyleSelect
            label="End"
            value={endArrowheadStyle}
            onChange={setEndArrowheadStyle}
          />
          <div className="prop-row">
            <span className="prop-label">Routing</span>
            <select
              className="prop-select"
              value={connectorRouting}
              onChange={(e) => setConnectorRouting(e.target.value as "free" | "orthogonal")}
            >
              <option value="free">Free</option>
              <option value="orthogonal">Orthogonal</option>
            </select>
          </div>
        </div>
      )}

      {(activeTool === "rounded-rectangle" || activeTool === "rectangle") && (
        <div className="prop-group">
          <h3>Border Radius</h3>
          <div className="prop-row">
            <span className="prop-label">Radius</span>
            <input
              className="prop-input"
              type="range"
              min={0}
              max={50}
              value={borderRadius}
              onChange={(e) => setBorderRadius(Number(e.target.value))}
            />
            <span style={{ fontSize: 12, color: "#aaa", minWidth: 36 }}>
              {borderRadius}px
            </span>
          </div>
        </div>
      )}

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
