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
import { EventsPage } from "./pages/observe/EventsPage";
import { EventDetailPage } from "./pages/observe/EventDetailPage";
import { PageEditorPage } from "./pages/observe/PageEditorPage";
import { PageDetailPage } from "./pages/observe/PageDetailPage";
import { SessionDetailPage } from "./pages/observe/SessionDetailPage";
import { HeatmapsPage } from "./pages/observe/HeatmapsPage";
import { HeatmapDetailPage } from "./pages/observe/PageHeatmapTab";
// import { ReplayPage } from "./pages/observe/ReplayPage";
// import { PatternAnalysisPage } from "./pages/analysis/PatternAnalysisPage";
// import { PatternClusterPage } from "./pages/analysis/PatternClusterPage";
// import { DiscoveredPatternsPage } from "./pages/analysis/DiscoveredPatternsPage";
// import { PatternCandidateDetailPage } from "./pages/analysis/PatternCandidateDetailPage";
import { UsersPage } from "./pages/users/UsersPage";
import { UserProfilePage } from "./pages/users/UserProfilePage";
import { AnonymousVisitorPage } from "./pages/users/AnonymousVisitorPage";
import { SegmentsPage } from "./pages/segments/SegmentsPage";
import { SegmentBuilderPage } from "./pages/segments/SegmentBuilderPage";
import { SegmentDetailPage } from "./pages/segments/SegmentDetailPage";
import { FunnelsPage } from "./pages/funnels/FunnelsPage";
import { FunnelBuilderPage } from "./pages/funnels/FunnelBuilderPage";
import { FunnelDetailPage } from "./pages/funnels/FunnelDetailPage";
import { ExperienceListPage } from "./pages/experiences/ExperienceListPage";
import { ExperienceEditorPage } from "./pages/experiences/ExperienceEditorPage";
import { DashboardListPage } from "./pages/dashboard/DashboardListPage";
import { DashboardWorkspacePage } from "./pages/dashboard/DashboardWorkspacePage";
import { ExperienceAnalyticsPage } from "./pages/analytics/ExperienceAnalyticsPage";

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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardListPage />} />
              <Route path="dashboard/new" element={<DashboardWorkspacePage mode="new" />} />
              <Route path="dashboard/:dashboardId" element={<DashboardWorkspacePage mode="view" />} />
              <Route path="dashboard/:dashboardId/edit" element={<DashboardWorkspacePage mode="edit" />} />
              <Route path="analytics" element={<ExperienceAnalyticsPage />} />
              <Route path="observe/sessions" element={<SessionsPage />} />
              <Route path="observe/sessions/:sessionId" element={<SessionDetailPage />} />
              <Route path="observe/pages" element={<PagesPage />} />
              <Route path="observe/events" element={<EventsPage />} />
              <Route path="observe/events/:eventName" element={<EventDetailPage />} />
              <Route path="observe/funnels" element={<FunnelsPage />} />
              <Route path="observe/funnels/new" element={<FunnelBuilderPage />} />
              <Route path="observe/funnels/:funnelId" element={<FunnelDetailPage />} />
              <Route path="observe/funnels/:funnelId/edit" element={<FunnelBuilderPage />} />
              <Route path="observe/pages/new" element={<PageEditorPage />} />
              <Route path="observe/pages/:pageId" element={<PageDetailPage />} />
              <Route path="observe/pages/:pageId/edit" element={<PageEditorPage />} />
              <Route path="observe/elements" element={<Navigate to="/observe/pages" replace />} />
              <Route path="observe/heatmaps" element={<HeatmapsPage />} />
              <Route path="observe/heatmaps/:pageId" element={<HeatmapDetailPage />} />
              {/* <Route path="observe/replay" element={<ReplayPage />} /> */}
              {/* <Route path="analysis/patterns" element={<PatternAnalysisPage />} /> */}
              {/* <Route path="analysis/clusters" element={<PatternClusterPage />} /> */}
              {/* <Route path="analysis/discovered" element={<DiscoveredPatternsPage />} /> */}
              {/* <Route path="analysis/discovered/:candidateId" element={<PatternCandidateDetailPage />} /> */}
              <Route path="users" element={<UsersPage />} />
              <Route path="users/anonymous/:anonymousId" element={<AnonymousVisitorPage />} />
              <Route path="users/:userId" element={<UserProfilePage />} />
              <Route path="segments" element={<SegmentsPage />} />
              <Route path="segments/new" element={<SegmentBuilderPage />} />
              <Route path="segments/:segmentId" element={<SegmentDetailPage />} />
              <Route path="segments/:segmentId/edit" element={<SegmentBuilderPage />} />
              <Route path="experiences/guides" element={<ExperienceListPage kind="guide" />} />
              <Route path="experiences/modals" element={<ExperienceListPage kind="widget" widgetType="modal" singularLabel="modal" pluralLabel="Modals" description="Create focused modal experiences inside your product." />} />
              <Route path="experiences/surveys" element={<ExperienceListPage kind="widget" widgetType="survey" singularLabel="survey" pluralLabel="Surveys" description="Collect contextual, multi-step feedback from active users." />} />
              <Route path="experiences/banners" element={<ExperienceListPage kind="widget" widgetType="banner" singularLabel="banner" pluralLabel="Banners" description="Create full-width banner experiences inside your product." />} />
              <Route path="experiences/checklists" element={<ExperienceListPage kind="widget" singularLabel="checklist" pluralLabel="Checklists" unsupported />} />
              <Route path="experiences/:experienceId/edit" element={<ExperienceEditorPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
