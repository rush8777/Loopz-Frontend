import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../theme";
export function SceneTransition({ children, duration, exitFrames = 8, style }: { children: ReactNode; duration: number; exitFrames?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const arrival = progress(frame, 0, 18);
  const exit = progress(frame, duration - exitFrames, duration);
  return <div className="shot" style={{ opacity: 1 - exit, transform: `translateY(${(1 - arrival) * 28 - exit * 16}px) scale(${1.025 - arrival * .025 + exit * .02})`, clipPath: `inset(0 ${(1 - arrival) * 4}% 0 ${(1 - arrival) * 4}%)`, ...style }}>{children}</div>;
}
