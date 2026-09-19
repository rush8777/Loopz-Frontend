import { useEffect, useRef } from "react";
import type { SessionEvent } from "../../types/api";

export type HeatmapLayer = "click" | "hover" | "cursor" | "scroll";

const LAYER_COLOR: Record<HeatmapLayer, string> = {
  click: "242, 169, 59", // --observe amber
  hover: "79, 209, 197", // --analysis teal, reused here purely as a distinct hue - not implying "analysis" section
  cursor: "232, 116, 140", // --feedback rose, same note
  scroll: "242, 169, 59",
};

interface Props {
  events: SessionEvent[];
  layer: HeatmapLayer;
  width: number;
  height: number;
  /** The viewport size active when coordinates were captured - needed to scale onto the rendered snapshot's size. */
  capturedViewport: { width: number; height: number } | null;
}

export function HeatmapOverlay({ events, layer, width, height, capturedViewport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const color = LAYER_COLOR[layer];
    const scaleX = capturedViewport ? width / capturedViewport.width : 1;
    const scaleY = capturedViewport ? height / capturedViewport.height : 1;

    if (layer === "scroll") {
      // Scroll events have no x/y - scrollPercent implies a vertical
      // position on the page, so it's drawn as a full-width band rather
      // than a point. Different visual language on purpose: this is a
      // 1-D signal, not a 2-D one, and pretending otherwise would misrepresent it.
      ctx.globalCompositeOperation = "lighter";
      for (const e of events) {
        if (e.type !== "scroll" || e.scrollPercent == null) continue;
        const y = (e.scrollPercent / 100) * height;
        const gradient = ctx.createLinearGradient(0, y - 14, 0, y + 14);
        gradient.addColorStop(0, `rgba(${color}, 0)`);
        gradient.addColorStop(0.5, `rgba(${color}, 0.10)`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y - 14, width, 28);
      }
      return;
    }

    ctx.globalCompositeOperation = "lighter";
    const radius = 26;
    for (const e of events) {
      if (e.type !== layer || e.x == null || e.y == null) continue;
      const x = e.x * scaleX;
      const y = e.y * scaleY;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${color}, 0.22)`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [events, layer, width, height, capturedViewport]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none" }}
    />
  );
}
