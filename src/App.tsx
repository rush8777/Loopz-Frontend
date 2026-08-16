import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider } from "./auth/AuthContext";
import { WorkspaceProvider } from "./auth/WorkspaceContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { SessionsPage } from "./pages/observe/SessionsPage";
import { SessionDetailPage } from "./pages/observe/SessionDetailPage";
import { HeatmapsPage } from "./pages/observe/HeatmapsPage";
import { ReplayPage } from "./pages/observe/ReplayPage";
import { PatternAnalysisPage } from "./pages/analysis/PatternAnalysisPage";

function Workspace({ children }: { children: ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <Workspace>
                  <AppShell />
                </Workspace>
              }
            >
              <Route index element={<Navigate to="/observe/sessions" replace />} />
              <Route path="observe/sessions" element={<SessionsPage />} />
              <Route path="observe/sessions/:sessionId" element={<SessionDetailPage />} />
              <Route path="observe/heatmaps" element={<HeatmapsPage />} />
              <Route path="observe/replay" element={<ReplayPage />} />
              <Route path="analysis/patterns" element={<PatternAnalysisPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
