import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
function go(path: string) { history.pushState({}, '', path.replace(/^\/journey/, (window as any).guideRoutePrefix ?? '/journey')); window.dispatchEvent(new Event('guide-test-route')); }
function App() {
  const [path, setPath] = useState(location.pathname); const [ready, setReady] = useState(false); const [clicks, setClicks] = useState(0);
  useEffect(() => { const update = () => setPath(location.pathname); addEventListener('popstate', update); addEventListener('guide-test-route', update); return () => { removeEventListener('popstate', update); removeEventListener('guide-test-route', update); }; }, []);
  useEffect(() => { setReady(false); const timer = setTimeout(() => setReady(true), 120); return () => clearTimeout(timer); }, [path]);
  return <><nav style={{ position: 'sticky', top: 0, height: 45, background: 'white', zIndex: 100 }}>React application · <button id="nav-start" onClick={() => go('/journey/start')}>Home</button><button id="nav-feature" onClick={() => go('/journey/feature')}>Features</button><button id="nav-done" onClick={() => go('/journey/done')}>Done</button></nav><main style={{ padding: '150px 30px', minHeight: 1600 }}><h1 data-app-path>{path}</h1>{ready && !path.endsWith('/done') && <section id="feature-card" style={{ padding: 20, border: '1px solid #94a3b8', width: 240 }}><h2>Projects</h2><button id="use-feature" onClick={() => { setClicks(value => value + 1); go('/journey/done'); }}>Create project</button><button id="hover-feature">Hover for help</button></section>}<output id="site-clicks">{clicks}</output>{path.endsWith('/done') && <button id="finish-action" onClick={() => window.dispatchEvent(new CustomEvent('guide-test-event', { detail: 'project_created' }))}>Finish website task</button>}</main></>;
}
createRoot(document.getElementById('app')!).render(<App />);
(window as any).guideReactApp = { go };
