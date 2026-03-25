import { useRef, useEffect } from "react";
import type { DrawElement } from "../types";

interface LibraryItemPreviewProps {
  elements: DrawElement[];
  size?: number;
}

export default function LibraryItemPreview({ elements, size = 80 }: LibraryItemPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || elements.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if (el.x + el.width > maxX) maxX = el.x + el.width;
      if (el.y + el.height > maxY) maxY = el.y + el.height;
    }

    const padding = 8;
    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const scale = Math.min((size - padding * 2) / contentW, (size - padding * 2) / contentH);
    const offsetX = (size - contentW * scale) / 2 - minX * scale;
    const offsetY = (size - contentH * scale) / 2 - minY * scale;

    ctx.clearRect(0, 0, size, size);

    for (const el of elements) {
      ctx.save();
      ctx.translate(offsetX + el.x * scale, offsetY + el.y * scale);
      ctx.scale(scale, scale);

      const isTransparent = el.fillColor === "transparent";
      ctx.fillStyle = isTransparent ? "rgba(0,0,0,0)" : el.fillColor;
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.globalAlpha = el.opacity;

      if (el.strokeStyle === "dashed") {
        ctx.setLineDash([8, 4]);
      } else if (el.strokeStyle === "dotted") {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }

      switch (el.type) {
        case "rectangle":
          ctx.beginPath();
          ctx.rect(0, 0, el.width, el.height);
          if (!isTransparent) ctx.fill();
          ctx.stroke();
          break;

        case "rounded-rectangle": {
          const r = Math.min((el as any).borderRadius || 8, el.width / 2, el.height / 2);
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.lineTo(el.width - r, 0);
          ctx.quadraticCurveTo(el.width, 0, el.width, r);
          ctx.lineTo(el.width, el.height - r);
          ctx.quadraticCurveTo(el.width, el.height, el.width - r, el.height);
          ctx.lineTo(r, el.height);
          ctx.quadraticCurveTo(0, el.height, 0, el.height - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
          if (!isTransparent) ctx.fill();
          ctx.stroke();
          break;
        }

        case "ellipse": {
          ctx.beginPath();
          ctx.ellipse(el.width / 2, el.height / 2, Math.abs(el.width) / 2, Math.abs(el.height) / 2, 0, 0, Math.PI * 2);
          if (!isTransparent) ctx.fill();
          ctx.stroke();
          break;
        }

        case "diamond": {
          const cx = el.width / 2;
          const cy = el.height / 2;
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(el.width, cy);
          ctx.lineTo(cx, el.height);
          ctx.lineTo(0, cy);
          ctx.closePath();
          if (!isTransparent) ctx.fill();
          ctx.stroke();
          break;
        }

        case "star": {
          const cx = el.width / 2;
          const cy = el.height / 2;
          const outerR = Math.min(el.width, el.height) / 2;
          const innerR = outerR * 0.4;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
            else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
          }
          ctx.closePath();
          if (!isTransparent) ctx.fill();
          ctx.stroke();
          break;
        }

        case "hexagon": {
          const cx = el.width / 2;
          const cy = el.height / 2;
          const r = Math.min(el.width, el.height) / 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
            else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
          }
          ctx.closePath();
          if (!isTransparent) ctx.fill();
          ctx.stroke();
          break;
        }

        case "line":
        case "arrow": {
          if ("points" in el && el.points.length >= 2) {
            const start = el.points[0];
            const end = el.points[el.points.length - 1];
            ctx.beginPath();
            ctx.moveTo(start[0], start[1]);
            ctx.lineTo(end[0], end[1]);
            ctx.stroke();

            if (el.type === "arrow" && "endArrowhead" in el && el.endArrowhead !== "none") {
              const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
              const len = 10 + el.strokeWidth;
              const spread = Math.PI / 6;
              ctx.fillStyle = el.strokeColor;
              if (el.endArrowhead === "arrow") {
                ctx.beginPath();
                ctx.moveTo(end[0], end[1]);
                ctx.lineTo(end[0] - len * Math.cos(angle - spread), end[1] - len * Math.sin(angle - spread));
                ctx.moveTo(end[0], end[1]);
                ctx.lineTo(end[0] - len * Math.cos(angle + spread), end[1] - len * Math.sin(angle + spread));
                ctx.stroke();
              } else if (el.endArrowhead === "triangle") {
                ctx.beginPath();
                ctx.moveTo(end[0], end[1]);
                ctx.lineTo(end[0] - len * Math.cos(angle - spread), end[1] - len * Math.sin(angle - spread));
                ctx.lineTo(end[0] - len * Math.cos(angle + spread), end[1] - len * Math.sin(angle + spread));
                ctx.closePath();
                ctx.fill();
              } else if (el.endArrowhead === "circle") {
                ctx.beginPath();
                ctx.arc(end[0] - len * Math.cos(angle), end[1] - len * Math.sin(angle), len * 0.3, 0, Math.PI * 2);
                ctx.fill();
              } else if (el.endArrowhead === "bar") {
                const perpX = -Math.sin(angle);
                const perpY = Math.cos(angle);
                const half = len * 0.4;
                ctx.beginPath();
                ctx.moveTo(end[0] + perpX * half, end[1] + perpY * half);
                ctx.lineTo(end[0] - perpX * half, end[1] - perpY * half);
                ctx.stroke();
              }
            }
          }
          break;
        }

        case "freehand": {
          if ("points" in el && el.points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(el.points[0][0], el.points[0][1]);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i][0], el.points[i][1]);
            }
            ctx.stroke();
          }
          break;
        }

        case "text": {
          if ("text" in el) {
            ctx.fillStyle = el.strokeColor;
            ctx.font = `${(el as any).fontSize || 16}px ${(el as any).fontFamily || "sans-serif"}`;
            ctx.fillText((el as any).text, 0, (el as any).fontSize || 16);
          }
          break;
        }

        case "note": {
          const foldSize = Math.min(15, el.width / 3, el.height / 3);
          ctx.fillStyle = isTransparent ? "#fff59d" : el.fillColor;
          ctx.fillRect(0, 0, el.width, el.height);
          ctx.strokeRect(0, 0, el.width, el.height);
          ctx.beginPath();
          ctx.moveTo(el.width - foldSize, el.height);
          ctx.lineTo(el.width, el.height - foldSize);
          ctx.lineTo(el.width - foldSize, el.height - foldSize);
          ctx.closePath();
          ctx.fillStyle = "#e0e0e0";
          ctx.fill();
          break;
        }

        case "callout": {
          ctx.fillStyle = isTransparent ? "#ffffff" : el.fillColor;
          ctx.beginPath();
          ctx.roundRect(0, 0, el.width, el.height, 8);
          if (!isTransparent) ctx.fill();
          ctx.stroke();
          const tailX = el.width / 2;
          ctx.beginPath();
          ctx.moveTo(tailX - 10, el.height);
          ctx.lineTo(tailX, el.height + 15);
          ctx.lineTo(tailX + 10, el.height);
          if (!isTransparent) ctx.fill();
          ctx.stroke();
          break;
        }
      }

      ctx.restore();
    }
  }, [elements, size]);

  if (elements.length === 0) {
    return (
      <div className="library-item-preview-empty" style={{ width: size, height: size }}>
        <span>Empty</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="library-item-preview"
      style={{ width: size, height: size }}
    />
  );
}
