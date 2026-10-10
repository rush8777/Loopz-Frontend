import { useCurrentFrame } from "remotion";
import { LayoutGrid, House, Activity, Users, Plus, ChevronRight, Folder, Globe, CircleCheck, Sparkles, Bell, Search, Check, ArrowRight } from "lucide-react";
import { AnimatedCursor } from "./AnimatedCursor";
import { Brand } from "./MovcuesInterface";
import { enter, progress } from "../theme";
export function AcmeWorkspace() {
  const frame = useCurrentFrame();
  const highlight = progress(frame, 24, 41) * (1 - progress(frame, 121, 137));
  const tooltip = progress(frame, 42, 63) * (1 - progress(frame, 121, 136));
  const created = frame >= 129;
  const press = progress(frame, 109, 113) * (1 - progress(frame, 116, 121));
  return <div className="acme-window"><div className="acme-top"><div className="acme-brand"><span>a</span>acme<span className="acme-workspace-name">/ Acme Workspace</span></div><div className="acme-search"><Search size={20} />Search workspace<span>⌘ K</span></div><div className="acme-account"><Bell size={22} /><span className="person-avatar">JD</span></div></div>
    <div className="acme-body"><aside className="acme-sidebar"><span className="acme-sidebar-label">WORKSPACE</span>{[[House, "Overview"], [LayoutGrid, "Projects"], [Activity, "Activity"], [Users, "Team"]].map(([Icon, label]) => { const Component = Icon as typeof House; return <div key={String(label)} className={label === "Projects" ? "selected" : ""}><Component size={22} />{String(label)}</div>; })}<span className="acme-sidebar-label">YOUR SPACES</span><div><Folder size={22} />Design team</div><div className="acme-sidebar-bottom"><span className="person-avatar">JD</span><span>Jamie Davis<small>Design team</small></span></div></aside>
    <div className="acme-main"><div className="acme-heading"><span className="acme-breadcrumb">Workspace <ChevronRight size={18} /> Projects</span><h2>Your next big idea starts here.</h2><p>A shared space to bring your team’s work together.</p></div>
      <div className="acme-create" style={{ boxShadow: `0 0 0 ${highlight * 5}px #3156c825, 0 0 0 ${highlight * 11}px #3156c80b` }}><Plus size={22} />Create project</div>
      <div className="acme-subnav"><span className="selected">All projects</span><span>Recent</span><span>Archived</span><span><LayoutGrid size={20} /> <FilterIcon /></span></div>
      <div className="acme-projects" style={{ opacity: 1 - highlight * .22 }}><div className="acme-project"><span className="project-symbol"><Sparkles size={28} /></span><span className="project-category">GETTING STARTED</span><h3>Make room for your next idea.</h3><p>Bring tasks, ideas, and your team<br />together in one project.</p><div className="project-bottom"><span>Start with a blank project</span><ArrowRight size={20} /></div></div><div className="acme-project new-project" style={created ? enter(frame, 129, 140) : { opacity: .55 }}><span className="project-symbol"><Globe size={28} /></span><span className="project-category">{created ? "NEW PROJECT" : "YOUR FIRST PROJECT"}</span><h3>{created ? "Website launch" : "Ready when you are"}</h3><p>{created ? "A fresh start for your next idea." : "Give your team a place to get started."}</p><div className="project-bottom"><div className="project-people"><span className="person-avatar">JD</span><span className="person-avatar green">AL</span><span>Design team</span></div><span>{created ? "Just now" : "—"}</span></div></div></div>
      {created && <div className="project-success" style={enter(frame, 137, 147)}><CircleCheck size={25} />First project created <Check size={20} /></div>}
      <div className="anchored-guide" style={{ opacity: tooltip, transform: `translateY(${(1 - tooltip) * 20}px) scale(${.97 + tooltip * .03})`, clipPath: `inset(calc(${(1 - progress(frame, 42, 63)) * 100}% - 20px) -30px -30px -30px)` }}><span className="guide-pointer" /><div className="guide-label"><Brand /><span>Onboarding guide</span></div><h3>Create your first project</h3><p>Get started by creating a space<br />for your team’s work.</p><div className="guide-action" style={{ transform: `scale(${1 - press * .015})`, background: press > .5 ? "#2545a8" : "#3156c8" }}>Create project <ArrowRight size={23} /></div><div className="guide-footer"><span>Step 1 of 1</span><span>Contextual guidance</span></div></div>
    </div></div><AnimatedCursor />
  </div>;
}
function FilterIcon() { return <svg width="20" height="20" viewBox="0 0 20 20"><path d="M3 5H17M5 10H15M7 15H13" stroke="currentColor" strokeWidth="1.5" /></svg>; }
