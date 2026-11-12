import { Component, useEffect, type ReactNode } from "react";
import { Outlet } from "react-router-dom";

/** Clear the HTML startup screen only after a usable route has committed. */
export function StartupReady({ children, ready = true }: { children?: ReactNode; ready?: boolean }) {
  useEffect(() => {
    if (ready) window.dispatchEvent(new Event("movcues:startup-ready"));
  }, [ready]);
  return <>
    {ready && <span hidden data-startup-ready="true" />}
    {children === undefined ? <Outlet /> : children}
  </>;
}

export class StartupErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    window.dispatchEvent(new Event("movcues:startup-error"));
  }
  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="grid min-h-dvh place-items-center bg-background p-6">
          <div>
            <p>Movcues couldn't open this page.</p>
            <button type="button" onClick={() => window.location.reload()}>Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
