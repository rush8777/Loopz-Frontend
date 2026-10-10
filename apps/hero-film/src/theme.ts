import { Easing, interpolate } from "remotion";
// Match packages/tokens: neutral surfaces, GT Standard UI font and Movcues blue.
export const theme = { background: "#f7f8fb", ink: "#202020", muted: "#66738b", blue: "#3156c8", border: "#e0e5ed", green: "#287a4d" } as const;
export const ease = Easing.bezier(.22, .68, .24, 1);
export function progress(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}
export function enter(frame: number, start: number, end: number) {
  const p = progress(frame, start, end);
  return { opacity: p, transform: `translateY(${(1 - p) * 26}px)`, clipPath: `inset(${(1 - p) * 100}% 0 0 0)` };
}
