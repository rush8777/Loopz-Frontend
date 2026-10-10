import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { Brand } from "../components/MovcuesInterface";
import { enter, progress } from "../theme";
export function BrandScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 200, stiffness: 130, mass: 1 }, durationInFrames: 16 });
  const exit = progress(frame, 42, 59);
  return <div className="brand-shot" style={{ opacity: 1 - exit }}><div style={{ opacity: progress(frame, 0, 15), transform: `scale(${.96 + scale * .04})` }}><Brand large /></div><h2 style={enter(frame, 16, 29)}>Turn user behavior into action.</h2><p style={enter(frame, 22, 35)}>Understand. Target. Guide. Improve.</p><div className="brand-rule" style={{ transform: `scaleX(${progress(frame, 24, 36)})` }} /></div>;
}
