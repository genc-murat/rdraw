import useAppStore from "../store/useAppStore";

export default function ZoomControls() {
  const viewTransform = useAppStore((s) => s.viewTransform);
  const setViewTransform = useAppStore((s) => s.setViewTransform);
  const resetView = useAppStore((s) => s.resetView);

  const zoomPercent = Math.round(viewTransform.zoom * 100);

  return (
    <div className="zoom-controls">
      <button
        className="zoom-btn"
        onClick={() =>
          setViewTransform({
            zoom: Math.max(0.1, viewTransform.zoom * 0.8),
          })
        }
        title="Zoom out"
      >
        −
      </button>
      <span
        className="zoom-level"
        onClick={resetView}
        style={{ cursor: "pointer" }}
        title="Reset zoom"
      >
        {zoomPercent}%
      </span>
      <button
        className="zoom-btn"
        onClick={() =>
          setViewTransform({
            zoom: Math.min(10, viewTransform.zoom * 1.25),
          })
        }
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
}
