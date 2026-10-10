import { useCurrentFrame } from "remotion";
import { Brand } from "../components/MovcuesInterface";
import { enter, progress } from "../theme";
export function ProblemScene() {
  const frame = useCurrentFrame();
  const exit = progress(frame, 72, 84);
  return <div className="problem-shot" style={{ opacity: 1 - exit, transform: `translateY(${-exit * 65}px) scale(${1 + progress(frame, 0, 72) * .015})` }}>
    <div className="ambient-dashboard" style={{ opacity: progress(frame, 0, 11) * .42 }}><div className="ambient-top" /><div className="ambient-side" /><div className="ambient-plot"><i /><i /><i /><i /></div></div>
    <div className="problem-content"><div className="problem-eyebrow" style={enter(frame, 0, 14)}><Brand /><span>FROM FRICTION TO ACTION</span></div><div className="headline-mask"><h1 style={enter(frame, 12, 30)}>Users sign up.</h1></div><div className="headline-mask"><h1 className="blue" style={enter(frame, 31, 48)}>But where do they stop?</h1></div><p style={enter(frame, 40, 57)}>A better product journey starts with understanding.</p></div>
  </div>;
}
