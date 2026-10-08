import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import * as authApi from "../api/auth";

export function OnboardingGate() {
  const location = useLocation();
  const [complete, setComplete] = useState<boolean | null>(null);

  useEffect(() => { void authApi.getOnboarding().then((state) => setComplete(state.complete)).catch(() => setComplete(false)); }, []);
  if (complete === null) return <div className="min-h-dvh bg-background" />;
  if (!complete) return <Navigate to="/onboarding" replace state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }} />;
  return <Outlet />;
}
