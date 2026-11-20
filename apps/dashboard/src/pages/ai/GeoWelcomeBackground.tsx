import { useEffect, useRef } from "react";
import { mountGeoWelcomeGlass } from "./geoWelcomeGlass";
import "./GeoWelcomeBackground.css";

export function GeoWelcomeBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!canvas || !motion) return;
    let stop: (() => void) | undefined;

    const syncMotion = () => {
      if (motion.matches) {
        stop?.();
        stop = undefined;
      } else if (!stop) {
        stop = mountGeoWelcomeGlass(canvas);
      }
    };

    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => {
      motion.removeEventListener("change", syncMotion);
      stop?.();
    };
  }, []);

  return (
    <div className="geo-welcome-background" aria-hidden="true">
      <canvas ref={ref} />
      <div className="geo-welcome-fallback" />
    </div>
  );
}
