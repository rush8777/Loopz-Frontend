import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { useWorkspace } from "../auth/WorkspaceContext";
import * as sitesApi from "../api/sites";

export function TopBar() {
  const { user, logout } = useAuth();
  const { orgs, currentOrg, setCurrentOrgId, sites, currentSite, setCurrentSiteId, refreshSites } = useWorkspace();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [creatingSite, setCreatingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [creating, setCreating] = useState(false);

  async function onCreateSite(e: FormEvent) {
    e.preventDefault();
    if (!currentOrg || !newSiteName.trim()) return;
    setCreating(true);
    try {
      const site = await sitesApi.createSite(currentOrg.orgId, { name: newSiteName.trim() });
      await refreshSites();
      setCurrentSiteId(site.id);
      setCreatingSite(false);
      setNewSiteName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        height: 56,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {orgs.length > 1 && (
          <select
            className="input"
            style={{ height: 30, fontSize: 13 }}
            value={currentOrg?.orgId ?? ""}
            onChange={(e) => setCurrentOrgId(e.target.value)}
          >
            {orgs.map((o) => (
              <option key={o.orgId} value={o.orgId}>
                {o.name}
              </option>
            ))}
          </select>
        )}

        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>/</span>

        {sites.length > 0 ? (
          <select
            className="input"
            style={{ height: 30, fontSize: 13 }}
            value={currentSite?.id ?? ""}
            onChange={(e) => setCurrentSiteId(e.target.value)}
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No sites yet</span>
        )}

        {!creatingSite ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setCreatingSite(true)} disabled={!currentOrg}>
            + New site
          </button>
        ) : (
          <form onSubmit={onCreateSite} style={{ display: "flex", gap: 6 }}>
            <input
              autoFocus
              className="input"
              style={{ height: 30, width: 160, fontSize: 13 }}
              placeholder="Site name"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
            />
            <button type="submit" className="btn btn-sm btn-primary" disabled={creating}>
              {creating ? "…" : "Create"}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setCreatingSite(false)}>
              Cancel
            </button>
          </form>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setUserMenuOpen((v) => !v)}
          style={{ gap: 8 }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--surface-raised)",
              border: "1px solid var(--border-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {user?.email.slice(0, 1).toUpperCase()}
          </span>
          <span style={{ fontSize: 13 }}>{user?.email}</span>
        </button>

        {userMenuOpen && (
          <div
            className="card"
            style={{
              position: "absolute",
              right: 0,
              top: 40,
              width: 200,
              padding: 6,
              zIndex: 10,
            }}
            onMouseLeave={() => setUserMenuOpen(false)}
          >
            <button
              className="btn btn-ghost btn-sm btn-block"
              style={{ justifyContent: "flex-start", color: "var(--danger)" }}
              onClick={() => logout()}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
