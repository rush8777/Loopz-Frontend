import { useCurrentFrame } from "remotion";
import { CircleCheck, Eye, Check, ArrowRight } from "lucide-react";
import { MovcuesInterface, ShotLabel } from "../components/MovcuesInterface";
import { SceneTransition } from "../components/SceneTransition";
import { enter, progress } from "../theme";
export function ResultsScene() {
  const frame = useCurrentFrame();
  return <SceneTransition duration={90} exitFrames={10}><ShotLabel number="03" title="MEASURE" subtitle="Learn what happened. Decide what comes next." /><MovcuesInterface section="Experiences" title="Onboarding guide — Performance" subtitle="Experience engagement, measured in context.">
    <div className="experience-status"><span><CircleCheck size={22} />Published guide</span><span>Incomplete onboarding audience</span></div>
    <div className="film-metrics">{[[Eye, "Viewed", "120"], [Check, "Completed", "78"], [CircleCheck, "Completion rate", "65%"]].map(([Icon, label, value], i) => { const Component = Icon as typeof Eye; return <div className={i === 2 ? "metric-highlight" : ""} key={String(label)} style={enter(frame, 18 + i * 4, 33 + i * 4)}><span><Component size={25} />{String(label)}</span><strong>{String(value)}</strong><small>{i === 0 ? "Users who saw the guide" : i === 1 ? "Users who completed it" : "78 of 120 viewers"}</small></div>; })}</div>
    <div className="completion-heading"><strong>Guide completion</strong><span>65% completed</span></div><div className="completion-track"><div style={{ transform: `scaleX(${progress(frame, 42, 64) * .65})` }} /></div><div className="completion-legend"><span><i />Completed · 78</span><span><i />Not completed · 42</span></div>
    <div className="results-note"><span>Use engagement findings to improve your next experience.</span><ArrowRight size={24} /></div>
  </MovcuesInterface></SceneTransition>;
}
