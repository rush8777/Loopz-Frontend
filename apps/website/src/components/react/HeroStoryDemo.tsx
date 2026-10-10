import { useEffect, useRef, useState } from "react";
import { LazyMotion, domAnimation, useInView, useReducedMotion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import * as motion from "motion/react-m";
import { House, LayoutGrid, Activity, Users, Folder, Plus, Check, ArrowUpRight, ChevronRight, Search, Bell, Sparkles, CircleCheck, Filter, Globe, LockKeyhole } from "lucide-react";
import "./HeroStoryDemo.css";

const LOOP_MS = 15_000;
const stages = ["Understand behavior", "Target users", "Guide in context", "Measure completion"];
const funnel = [["Signed up", 1000], ["Started setup", 620], ["Created first project", 340]] as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const milestones = [0, 3000, 5000, 5800, 8100, 8700, 8900, 10000, 13000];

function StoryCursor({ clock }: { clock: MotionValue<number> }) {
  const x = useTransform(clock, value => -110 * clamp((value - 6000) / 2200));
  const y = useTransform(clock, value => -72 * clamp((value - 6000) / 2200));
  const opacity = useTransform(clock, value => value >= 5800 && value < 8900 ? 1 : 0);
  const ring = useTransform(clock, value => value >= 8100 && value < 8700 ? 1 : 0);
  return <motion.div className="mc-cursor" style={{ x, y, opacity }} aria-hidden="true">
    <motion.span className="mc-click-ring" style={{ opacity: ring }} />
    <svg width="25" height="30" viewBox="0 0 25 30"><path d="M2 2L3 24L9 18L14 28L19 25L14 16L23 15Z" fill="#172441" stroke="white" strokeWidth="2" /></svg>
  </motion.div>;
}

/** Elapsed time is the sole scene input, so the composition can also be rendered as a video. */
export function HeroStoryFrame({ elapsed = 0, staticView = false, clock }: { elapsed?: number; staticView?: boolean; clock?: MotionValue<number> }) {
  const t = elapsed / 1000;
  const scene = t < 3 ? 0 : t < 5 ? 1 : t < 10 ? 2 : 3;
  const reset = !staticView && t >= 13 ? .4 : 1;
  const audience = staticView || t >= 3;
  const guidance = staticView || (t >= 5 && t < 8.7);
  const created = staticView || t >= 8.7;
  const results = staticView || t >= 10;
  const guideOpacity = guidance || t < 5 ? 1 : 0;
  const transition = { duration: staticView ? 0 : t >= 13 ? 1.8 : .45 };

  return <div className="mc-story-frame" data-scene={staticView ? "static" : scene} data-elapsed={Math.round(elapsed)}>
    <div className="mc-story-toolbar">
      <span className="mc-brand"><span className="mc-brand-mark">m</span> movcues <span className="mc-demo-tag">PRODUCT WALKTHROUGH</span></span>
      <span className="mc-sample">Illustrative data</span>
    </div>
    <div className="mc-story-canvas" aria-hidden="true">
      <div className="mc-canvas-label"><span className="mc-live-dot" /> A connected activation workflow <span>BEHAVIOR → EXPERIENCE → INSIGHT</span></div>
      <div className="mc-app">
        <div className="mc-app-bar"><span className="mc-window-dots">● ● ●</span><span className="mc-address"><LockKeyhole size={10} /> app.acme.com / workspace</span><span className="mc-browser-actions"><Search size={13} /><Bell size={13} /><span className="mc-avatar">JD</span></span></div>
        <div className="mc-app-body">
          <aside className="mc-sidebar">
            <strong><span className="mc-acme-mark">a</span> acme</strong>
            <span><House size={14} /><span>Overview</span></span><span className="mc-nav-selected"><LayoutGrid size={14} /><span>Projects</span><small>2</small></span>
            <span><Activity size={14} /><span>Activity</span></span><span><Users size={14} /><span>Team</span></span>
            <small>YOUR WORKSPACE</small><span><Folder size={14} /><span>Design team</span></span>
            <div className="mc-sidebar-bottom"><span className="mc-avatar">JD</span> Jamie Davis</div>
          </aside>
          <div className="mc-workspace">
            <div className="mc-workspace-heading"><div><span className="mc-breadcrumb">Workspace / Projects</span><h3>Your next big idea<br />starts here.</h3><p>A shared space to bring your team’s work together.</p></div>
              <div className={`mc-create-button ${guidance ? "is-highlighted" : ""}`}><Plus size={13} /> Create project</div>
            </div>
            <div className="mc-project-grid">
              <div className="mc-project-card"><span className="mc-project-icon"><Sparkles size={21} /></span><strong>Welcome to your workspace</strong><p>Create a project to organize tasks,<br />share ideas, and make progress.</p><span className="mc-project-empty">Your first project belongs here</span></div>
              <motion.div className="mc-project-card mc-new-project" initial={false} animate={{ opacity: created ? 1 : .35, y: created ? 0 : 8 }} transition={transition}>
                <span className="mc-project-icon"><Globe size={21} /></span><strong>{created ? "Website launch" : "Ready when you are"}</strong><p>{created ? "A fresh start for your next idea." : "One project. A whole team of possibilities."}</p>
                <span className={created ? "mc-success" : "mc-project-empty"}>{created ? "✓ First project created" : "No projects yet"}</span>
                <div className="mc-project-meta"><span className="mc-avatar">JD</span><span className="mc-avatar">AL</span><span>Design team</span><span>•••</span></div>
              </motion.div>
            </div>
            <div className="mc-workspace-status"><span><CircleCheck size={13} /> Workspace ready</span><span>Invite your teammates <ChevronRight size={12} /></span></div>
          </div>
        </div>
      </div>

      <motion.section className="mc-floating mc-analytics" aria-label="Onboarding funnel" initial={false} animate={{ opacity: reset, y: scene > 0 ? -5 : 0 }} transition={transition}>
        <div className="mc-card-kicker"><span className="mc-mini-logo">m</span> BEHAVIOR INSIGHT <span className="mc-card-index">01</span></div>
        <h4>Where onboarding stalls</h4><p className="mc-card-subtitle">Activation funnel · Last 30 days</p>
        <div className="mc-funnel">{funnel.map(([label, count], i) => <div className={`mc-funnel-row ${i === 2 ? "mc-funnel-focus" : ""}`} key={label}>
          <div><span>{label}</span><strong>{count.toLocaleString("en-US")}</strong></div>
          <div className="mc-bar-track"><motion.div initial={false} style={{ width: `${count / 10}%`, transformOrigin: "left" }} animate={{ scaleX: staticView || scene > 0 ? 1 : .92 }} transition={transition} /></div>
        </div>)}</div>
        <div className="mc-insight"><span><ArrowUpRight size={21} /></span><p><strong>280 users</strong> started setup<br />but didn’t create a project.</p><span className="mc-drop-badge">45% drop-off</span></div>
      </motion.section>

      <svg className="mc-connector" viewBox="0 0 1000 580" preserveAspectRatio="none" aria-hidden="true" style={{ opacity: audience ? reset : .15 }}><path d="M 296 106 C 420 106 530 106 660 106" fill="none" stroke="#3156c8" strokeWidth="1.5" strokeDasharray="4 5" /><circle cx="655" cy="106" r="3" fill="#3156c8" /></svg>

      <motion.section className="mc-floating mc-audience" aria-label="Target audience" initial={false} animate={{ opacity: reset, y: audience ? 0 : 10 }} transition={transition}>
        <div className="mc-card-kicker"><span className="mc-mini-logo">m</span> AUDIENCE <span className="mc-card-index">02</span></div>
        <h4>Incomplete onboarding</h4><p className="mc-card-subtitle"><Filter size={11} /> Match all of these conditions</p><div className="mc-condition"><span className="mc-condition-check"><Check size={11} /></span><span>Performed <strong>setup_started</strong></span></div>
        <span className="mc-rule-and">AND</span>
        <div className="mc-condition"><span className="mc-condition-minus">−</span><span>Has not performed <strong>project_created</strong></span></div>
        <div className="mc-audience-count"><strong>280</strong><span>matching users</span><span className="mc-segment-badge">Ready to target</span></div>
        <span className="mc-human-action">Team-defined audience rules</span>
      </motion.section>

      <motion.section className="mc-tooltip" aria-label="Contextual onboarding guide" initial={false} animate={{ opacity: reset * guideOpacity, y: guidance ? 0 : 8, scale: guidance ? 1 : .98 }} transition={transition}>
        <div className="mc-tooltip-arrow" /><span className="mc-tooltip-label"><span className="mc-mini-logo">m</span> Movcues · Onboarding guide</span>
        <h4>Create your first project</h4><p>Start organizing your work by creating a project for your team.</p>
        <div className="mc-tooltip-cta">Create project <span>→</span></div><span className="mc-guide-step">Step 1 of 1 · Contextual guidance</span>
      </motion.section>
      {!staticView && clock && <StoryCursor clock={clock} />}

      <motion.section className="mc-floating mc-results" aria-label="Experience completion results" initial={false} animate={{ opacity: reset * (results ? 1 : 0), y: results ? 0 : 15 }} transition={transition}>
        <div className="mc-card-kicker"><span className="mc-mini-logo">m</span> EXPERIENCE RESULTS <span className="mc-card-index">04</span></div>
        <h4>Onboarding guide <span className="mc-result-check">✓</span></h4>
        <div className="mc-result-metrics"><div><strong>120</strong><span>Viewed</span></div><div><strong>78</strong><span>Completed</span></div><div><strong>65<span>%</span></strong><span>Completion</span></div></div>
        <div className="mc-result-chart"><span>Experience completion</span><svg viewBox="0 0 100 28" aria-hidden="true"><path d="M0 25L12 21L24 23L36 14L48 17L60 10L72 13L84 5L100 3" fill="none" stroke="#3156c8" strokeWidth="2" /><path d="M0 25L12 21L24 23L36 14L48 17L60 10L72 13L84 5L100 3V28H0Z" fill="#3156c810" /></svg></div>
        <div className="mc-bar-track"><motion.div initial={false} style={{ width: "65%", transformOrigin: "left" }} animate={{ scaleX: results ? 1 : 0 }} transition={{ duration: staticView ? 0 : 1.2 }} /></div>
        <p className="mc-human-action">Experience completion · Illustrative results</p>
      </motion.section>
    </div>
    <div className="mc-stage-track" aria-label="Product workflow">
      {stages.map((label, i) => <span key={label} className={staticView || scene === i ? "is-current" : ""}><span>0{i + 1}</span>{label}</span>)}
    </div>
  </div>;
}

export default function HeroStoryDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: .15 });
  const reduced = useReducedMotion();
  const [compact, setCompact] = useState(false);
  const [reducePreference, setReducePreference] = useState(false);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const clock = useMotionValue(0);
  const milestone = useRef(0);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCompact(query.matches);
    const updateMotion = () => setReducePreference(motionQuery.matches);
    const visibility = () => setVisible(!document.hidden);
    update(); updateMotion(); visibility();
    motionQuery.addEventListener("change", updateMotion);
    query.addEventListener("change", update); document.addEventListener("visibilitychange", visibility);
    return () => { query.removeEventListener("change", update); motionQuery.removeEventListener("change", updateMotion); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  const staticView = Boolean(reduced) || reducePreference || compact;
  const running = inView && visible && !paused && !staticView;
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const time = (clock.get() + Math.min(now - previous, 100)) % LOOP_MS;
      clock.set(time);
      previous = now;
      const next = milestones.filter(value => value <= time).length - 1;
      if (next !== milestone.current) { milestone.current = next; setElapsed(milestones[next]); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, clock]);

  return <div className="mc-story-demo" ref={ref}>
    <LazyMotion features={domAnimation} strict><HeroStoryFrame elapsed={elapsed} staticView={staticView} clock={clock} /></LazyMotion>
    <div className="mc-demo-footer">
      <p>Understand drop-offs. Reach the right users. Guide their next step.<span> Illustrative product walkthrough and results.</span></p>
      {staticView ? <span className="mc-static-note">Static preview</span> : <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "▶ Play" : "Ⅱ Pause"} animation</button>}
    </div>
  </div>;
}
