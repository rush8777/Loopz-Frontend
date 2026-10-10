import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import "./HeroStoryDemo.css";

const LOOP_MS = 15_000;
const stages = ["Understand behavior", "Target users", "Guide in context", "Measure completion"];
const funnel = [["Signed up", 1000], ["Started setup", 620], ["Created first project", 340]] as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Elapsed time is the sole scene input, so the composition can also be rendered as a video. */
export function HeroStoryFrame({ elapsed = 0, staticView = false }: { elapsed?: number; staticView?: boolean }) {
  const t = elapsed / 1000;
  const scene = t < 3 ? 0 : t < 5 ? 1 : t < 10 ? 2 : 3;
  const reset = !staticView && t >= 13 ? 1 - clamp((t - 13) / 1.8) : 1;
  const audience = staticView || t >= 3;
  const guidance = staticView || (t >= 5 && t < 8.7);
  const created = staticView || t >= 8.7;
  const results = staticView || t >= 10;
  const guideOpacity = guidance || t < 5 ? 1 : 0;
  const cursorProgress = clamp((t - 6) / 2.2);
  const transition = { duration: staticView ? 0 : .45 };

  return <div className="mc-story-frame" data-scene={staticView ? "static" : scene} data-elapsed={Math.round(elapsed)}>
    <div className="mc-story-toolbar">
      <span className="mc-brand"><span className="mc-brand-mark">m</span> movcues <span className="mc-demo-tag">PRODUCT WALKTHROUGH</span></span>
      <span className="mc-sample">Illustrative data</span>
    </div>
    <div className="mc-story-canvas">
      <div className="mc-app">
        <div className="mc-app-bar"><span className="mc-window-dots">● ● ●</span><span>Acme Workspace</span><span className="mc-avatar">JD</span></div>
        <div className="mc-app-body">
          <aside className="mc-sidebar">
            <strong><span className="mc-acme-mark">a</span> acme</strong>
            <span>⌂ <span>Overview</span></span><span className="mc-nav-selected">▦ <span>Projects</span></span>
            <span>◷ <span>Activity</span></span><span>♧ <span>Team</span></span>
            <small>YOUR WORKSPACE</small><span>◇ <span>Design team</span></span>
            <div className="mc-sidebar-bottom"><span className="mc-avatar">JD</span> Jamie Davis</div>
          </aside>
          <div className="mc-workspace">
            <div className="mc-workspace-heading"><div><span className="mc-breadcrumb">Workspace / Projects</span><h3>Your next big idea<br />starts here.</h3><p>A shared space to bring your team’s work together.</p></div>
              <div className={`mc-create-button ${guidance ? "is-highlighted" : ""}`}>+ Create project</div>
            </div>
            <div className="mc-project-grid">
              <div className="mc-project-card"><span className="mc-project-icon">✧</span><strong>Welcome to your workspace</strong><p>Create a project to organize tasks,<br />share ideas, and make progress.</p><span className="mc-project-empty">Your first project belongs here</span></div>
              <motion.div className="mc-project-card mc-new-project" initial={false} animate={{ opacity: created ? 1 : .35, y: created ? 0 : 8 }} transition={transition}>
                <span className="mc-project-icon">▤</span><strong>{created ? "Website launch" : "Ready when you are"}</strong><p>{created ? "A fresh start for your next idea." : "One project. A whole team of possibilities."}</p>
                <span className={created ? "mc-success" : "mc-project-empty"}>{created ? "✓ First project created" : "No projects yet"}</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <motion.section className="mc-floating mc-analytics" aria-label="Onboarding funnel" initial={false} animate={{ opacity: reset, y: scene > 0 ? -5 : 0 }} transition={transition}>
        <div className="mc-card-kicker"><span className="mc-mini-logo">m</span> BEHAVIOR INSIGHT <span className="mc-card-index">01</span></div>
        <h4>Where onboarding stalls</h4><p className="mc-card-subtitle">Activation funnel · Last 30 days</p>
        <div className="mc-funnel">{funnel.map(([label, count], i) => <div className={`mc-funnel-row ${i === 2 ? "mc-funnel-focus" : ""}`} key={label}>
          <div><span>{label}</span><strong>{count.toLocaleString("en-US")}</strong></div>
          <div className="mc-bar-track"><motion.div initial={false} animate={{ width: `${count / 10 * (staticView ? 1 : clamp((t - i * .25) / 1.3))}%` }} transition={{ duration: 0 }} /></div>
        </div>)}</div>
        <div className="mc-insight"><span>↘</span><p><strong>280 users</strong> started setup<br />but didn’t create a project.</p></div>
      </motion.section>

      <svg className="mc-connector" viewBox="0 0 1000 580" preserveAspectRatio="none" aria-hidden="true" style={{ opacity: audience ? reset : .15 }}><path d="M 296 106 C 420 106 530 106 660 106" fill="none" stroke="#3156c8" strokeWidth="1.5" strokeDasharray="4 5" /><circle cx="655" cy="106" r="3" fill="#3156c8" /></svg>

      <motion.section className="mc-floating mc-audience" aria-label="Target audience" initial={false} animate={{ opacity: reset, y: audience ? 0 : 10 }} transition={transition}>
        <div className="mc-card-kicker"><span className="mc-mini-logo">m</span> AUDIENCE <span className="mc-card-index">02</span></div>
        <h4>Incomplete onboarding</h4><div className="mc-condition"><span className="mc-condition-check">✓</span><span>Performed <strong>setup_started</strong></span></div>
        <div className="mc-condition"><span className="mc-condition-minus">−</span><span>Has not performed <strong>project_created</strong></span></div>
        <div className="mc-audience-count"><strong>{Math.round(280 * (staticView ? 1 : clamp((t - 3) / .9)))}</strong><span>matching users</span><span className="mc-live-dot" /></div>
        <span className="mc-human-action">Team-defined audience rules</span>
      </motion.section>

      <motion.section className="mc-tooltip" aria-label="Contextual onboarding guide" initial={false} animate={{ opacity: reset * guideOpacity, y: guidance ? 0 : 8, scale: guidance ? 1 : .98 }} transition={transition}>
        <div className="mc-tooltip-arrow" /><span className="mc-tooltip-label"><span className="mc-mini-logo">m</span> Movcues · Onboarding guide</span>
        <h4>Create your first project</h4><p>Start organizing your work by creating a project for your team.</p>
        <div className="mc-tooltip-cta">Create project <span>→</span></div><span className="mc-guide-step">Step 1 of 1 · Contextual guidance</span>
      </motion.section>
      {!staticView && t >= 5.8 && t < 8.9 && <div className="mc-cursor" style={{ left: `calc(100% - ${90 + cursorProgress * 110}px)`, top: `${590 - cursorProgress * 72}px` }}>
        {t > 8.1 && <span className="mc-click-ring" />}
        <svg width="25" height="30" viewBox="0 0 25 30" aria-hidden="true"><path d="M2 2L3 24L9 18L14 28L19 25L14 16L23 15Z" fill="#172441" stroke="white" strokeWidth="2" /></svg>
      </div>}

      <motion.section className="mc-floating mc-results" aria-label="Experience completion results" initial={false} animate={{ opacity: reset * (results ? 1 : 0), y: results ? 0 : 15 }} transition={transition}>
        <div className="mc-card-kicker"><span className="mc-mini-logo">m</span> EXPERIENCE RESULTS <span className="mc-card-index">04</span></div>
        <h4>Onboarding guide <span className="mc-result-check">✓</span></h4>
        <div className="mc-result-metrics"><div><strong>120</strong><span>Viewed</span></div><div><strong>78</strong><span>Completed</span></div><div><strong>65<span>%</span></strong><span>Completion</span></div></div>
        <div className="mc-bar-track"><motion.div initial={false} animate={{ width: `${65 * (staticView ? 1 : clamp((t - 10) / 1.2))}%` }} transition={{ duration: 0 }} /></div>
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
  const clock = useRef(0);
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
    let lastPaint = previous;
    const tick = (now: number) => {
      clock.current = (clock.current + Math.min(now - previous, 100)) % LOOP_MS;
      previous = now;
      if (now - lastPaint >= 32) { setElapsed(clock.current); lastPaint = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return <div className="mc-story-demo" ref={ref}>
    <HeroStoryFrame elapsed={elapsed} staticView={staticView} />
    <div className="mc-demo-footer">
      <p>From onboarding friction to a targeted experience.<span> Illustrative product walkthrough.</span></p>
      {staticView ? <span className="mc-static-note">Static preview</span> : <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "▶ Play" : "Ⅱ Pause"} animation</button>}
    </div>
  </div>;
}
