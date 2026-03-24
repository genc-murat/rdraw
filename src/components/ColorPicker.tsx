import { useState } from "react";
import useAppStore from "../store/useAppStore";
import { COLORS } from "../utils/constants";

export default function ColorPicker({
  color,
  onChange,
  label,
}: {
  color: string;
  onChange: (color: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const theme = useAppStore((s) => s.theme);
  const transparentBg = theme === "light" ? "#ffffff" : "#1e1e1e";

  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      <div
        className="color-swatch"
        style={{ background: color === "transparent" ? transparentBg : color }}
        onClick={() => setOpen(!open)}
      >
        {color === "transparent" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(45deg, #ff0000 50%, transparent 50%)",
              opacity: 0.3,
              borderRadius: 4,
            }}
          />
        )}
      </div>
      {open && (
        <div className="color-picker-popover" style={{ position: "absolute", zIndex: 1000 }}>
          <div className="color-grid">
            <div
              className={`color-grid-item ${color === "transparent" ? "selected" : ""}`}
              style={{
                background: transparentBg,
                position: "relative",
                overflow: "hidden",
              }}
              onClick={() => {
                onChange("transparent");
                setOpen(false);
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(45deg, #ff0000 50%, transparent 50%)",
                  opacity: 0.3,
                }}
              />
            </div>
            {COLORS.map((c) => (
              <div
                key={c}
                className={`color-grid-item ${color === c ? "selected" : ""}`}
                style={{ background: c }}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
