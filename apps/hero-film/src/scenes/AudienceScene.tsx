import { useCurrentFrame } from "remotion";
import { Check, Minus, CircleCheck, Users, Filter } from "lucide-react";
import { ShotLabel, MovcuesInterface } from "../components/MovcuesInterface";
import { SceneTransition } from "../components/SceneTransition";
import { enter, progress } from "../theme";
export function AudienceScene() {
  const frame = useCurrentFrame();
  return <SceneTransition duration={102}><ShotLabel number="02" title="TARGET" subtitle="Reach the users who need the next step." /><MovcuesInterface section="Audiences" title="Incomplete onboarding" subtitle="A focused audience, configured by your team.">
    <div className="audience-rule-header"><Filter size={23} /><span>Match <strong>all</strong> of these conditions</span><span className="rule-pill">Behavioral audience</span></div>
    <div className="film-rule" style={enter(frame, 18, 30)}><span className="rule-icon"><Check size={25} /></span><div><small>EVENT HAS OCCURRED</small><span>Performed <code>setup_started</code></span></div><span className="rule-source">Event</span></div>
    <div className="rule-join" style={enter(frame, 29, 36)}>AND</div>
    <div className="film-rule" style={enter(frame, 30, 42)}><span className="rule-icon rule-minus"><Minus size={25} /></span><div><small>EVENT HAS NOT OCCURRED</small><span>Has not performed <code>project_created</code></span></div><span className="rule-source">Event</span></div>
    <div className="audience-preview" style={enter(frame, 43, 54)}><div className="matching-number"><Users size={34} /><strong>{Math.round(progress(frame, 43, 61) * 280)}</strong><span>matching users</span></div><span className="audience-ready" style={enter(frame, 62, 78)}><CircleCheck size={24} /> Audience ready</span></div>
    <p className="panel-footnote">Use this audience when configuring a relevant experience.</p>
  </MovcuesInterface></SceneTransition>;
}
