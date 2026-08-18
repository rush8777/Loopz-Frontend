import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <TopBar />
        <main style={{ padding: 28, maxWidth: 1200 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
