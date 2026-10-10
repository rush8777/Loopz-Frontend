import { useCurrentFrame } from "remotion";
import { progress } from "../theme";
export const CURSOR_TARGET = { x: 1485, y: 488 };
export function AnimatedCursor() {
  const frame = useCurrentFrame();
  const move = progress(frame, 84, 108);
  const press = progress(frame, 109, 113) * (1 - progress(frame, 116, 121));
  const ripple = progress(frame, 109, 121);
  const visible = progress(frame, 82, 88) * (1 - progress(frame, 128, 136));
  return <div className="film-cursor" style={{ left: CURSOR_TARGET.x + (1 - move) * 150, top: CURSOR_TARGET.y + (1 - move) * 205, opacity: visible, transform: `scale(${1 - press * .1})` }}>
    {frame >= 109 && <span className="cursor-ripple" style={{ opacity: (1 - ripple) * .6, transform: `translate(-50%, -50%) scale(${.4 + ripple * 2})` }} />}
    <svg width="37" height="44" viewBox="0 0 25 30"><path d="M2 2L3 24L9 18L14 28L19 25L14 16L23 15Z" fill="#202b40" stroke="white" strokeWidth="2" /></svg>
  </div>;
}
