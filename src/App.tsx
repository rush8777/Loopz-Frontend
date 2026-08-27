import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider } from "./auth/AuthContext";
import { WorkspaceProvider } from "./auth/WorkspaceContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { SessionsPage } from "./pages/observe/SessionsPage";
import { PagesPage } from "./pages/observe/PagesPage";
import { PageEditorPage } from "./pages/observe/PageEditorPage";
import { PageDetailPage } from "./pages/observe/PageDetailPage";
import { ElementsPage } from "./pages/observe/ElementsPage";
import { SessionDetailPage } from "./pages/observe/SessionDetailPage";
import { HeatmapsPage } from "./pages/observe/HeatmapsPage";
import { ReplayPage } from "./pages/observe/ReplayPage";
import { PatternAnalysisPage } from "./pages/analysis/PatternAnalysisPage";
import { PatternClusterPage } from "./pages/analysis/PatternClusterPage";
import { DiscoveredPatternsPage } from "./pages/analysis/DiscoveredPatternsPage";
import { PatternCandidateDetailPage } from "./pages/analysis/PatternCandidateDetailPage";
import { UsersPage } from "./pages/users/UsersPage";
import { UserProfilePage } from "./pages/users/UserProfilePage";
import { AnonymousVisitorPage } from "./pages/users/AnonymousVisitorPage";

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
              <Route path="observe/pages" element={<PagesPage />} />
              <Route path="observe/pages/new" element={<PageEditorPage />} />
              <Route path="observe/pages/:pageId" element={<PageDetailPage />} />
              <Route path="observe/pages/:pageId/edit" element={<PageEditorPage />} />
              <Route path="observe/elements" element={<ElementsPage />} />
              <Route path="observe/heatmaps" element={<HeatmapsPage />} />
              <Route path="observe/replay" element={<ReplayPage />} />
              <Route path="analysis/patterns" element={<PatternAnalysisPage />} />
              <Route path="analysis/clusters" element={<PatternClusterPage />} />
              <Route path="analysis/discovered" element={<DiscoveredPatternsPage />} />
              <Route path="analysis/discovered/:candidateId" element={<PatternCandidateDetailPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/anonymous/:anonymousId" element={<AnonymousVisitorPage />} />
              <Route path="users/:userId" element={<UserProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
