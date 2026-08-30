import { useState, type FormEvent } from "react";
import * as sitesApi from "../../api/sites";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { SettingsHeading } from "./SettingsShared";

export function SitesSettings() {
  const { currentOrg, sites, currentSite, setCurrentSiteId, refreshSites } = useWorkspace();
  const [creatingSite, setCreatingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreateSite(event: FormEvent) {
    event.preventDefault();
    if (!currentOrg || !newSiteName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const site = await sitesApi.createSite(currentOrg.orgId, { name: newSiteName.trim() });
      await refreshSites();
      setCurrentSiteId(site.id);
      setCreatingSite(false);
      setNewSiteName("");
    } catch {
      setError("Couldn't create the site. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <SettingsHeading title="Sites" description="Choose which site Loopz uses across the workspace." />
      <div className="settings-site-list" aria-label="Sites">
        {sites.length === 0 && <div className="settings-empty">No sites yet.</div>}
        {sites.map((site) => {
          const isCurrent = site.id === currentSite?.id;
          return (
            <button
              type="button"
              key={site.id}
              className={`settings-site${isCurrent ? " is-current" : ""}`}
              onClick={() => setCurrentSiteId(site.id)}
              aria-pressed={isCurrent}
            >
              <span className="settings-site-dot" aria-hidden="true" />
              <span className="settings-site-details">
                <strong>{site.name}</strong>
                <span>{site.domain ?? "No domain set"}</span>
              </span>
              {isCurrent && <span className="badge badge-neutral">Current</span>}
            </button>
          );
        })}
      </div>

      {!creatingSite ? (
        <button type="button" className="btn btn-primary" onClick={() => setCreatingSite(true)} disabled={!currentOrg}>
          + Add site
        </button>
      ) : (
        <form className="settings-create-site" onSubmit={(event) => void onCreateSite(event)}>
          <label className="field">
            <span>Site name</span>
            <input
              autoFocus
              className="input"
              placeholder="My website"
              value={newSiteName}
              onChange={(event) => setNewSiteName(event.target.value)}
            />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={creating || !newSiteName.trim()}>
              {creating ? "Creating…" : "Create site"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setCreatingSite(false)} disabled={creating}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
