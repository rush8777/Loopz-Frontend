import { useCurrentFrame } from "remotion";
import { ArrowDownRight, Users } from "lucide-react";
import { ShotLabel, MovcuesInterface } from "../components/MovcuesInterface";
import { SceneTransition } from "../components/SceneTransition";
import { enter, progress } from "../theme";
const steps = [["Signed up", 1000, "100%"], ["Started setup", 620, "62%"], ["Created first project", 340, "34%"]] as const;
export function AnalyticsScene() {
  const frame = useCurrentFrame();
  const emphasis = progress(frame, 47, 67);
  return <SceneTransition duration={108}><ShotLabel number="01" title="UNDERSTAND" subtitle="Find the moment users stop." /><MovcuesInterface section="Analytics" title="Onboarding funnel" subtitle="From sign-up to the first meaningful action.">
    <div className="funnel-meta"><span><Users size={22} /> Unique users</span><span>3 steps · Activation</span></div>
    <div className="film-funnel">{steps.map(([label, value, percent], index) => <div className={`film-funnel-row ${index === 2 ? "focus-row" : ""}`} key={label} style={{ opacity: index < 2 ? 1 - emphasis * .25 : 1 }}><div className="funnel-row-title"><span><i>0{index + 1}</i>{label}</span><strong>{value.toLocaleString("en-US")} <small>{percent}</small></strong></div><div className="film-bar-track"><div style={{ width: `${value / 10}%`, transform: `scaleX(${progress(frame, 18 + index * 6, 34 + index * 6)})`, background: index === 2 ? "#3156c8" : index === 1 ? "#90a8e5" : "#c2d0ef" }} /></div></div>)}</div>
    <div className="funnel-insight" style={enter(frame, 68, 86)}><span className="insight-icon"><ArrowDownRight size={32} /></span><div><strong>280 users didn’t complete setup.</strong><p>45% drop-off after setup started.</p></div><span className="insight-cohort">Explore this cohort →</span></div>
  </MovcuesInterface></SceneTransition>;
}
