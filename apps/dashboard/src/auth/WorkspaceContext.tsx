import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as sitesApi from "../api/sites";
import * as authApi from "../api/auth";
import { useAuth } from "./AuthContext";
import type { Org, Site } from "../types/api";

interface WorkspaceContextValue {
  orgs: Org[];
  currentOrg: Org | null;
  setCurrentOrgId: (orgId: string) => void;
  sites: Site[];
  currentSite: Site | null;
  setCurrentSiteId: (siteId: string | null) => void;
  loading: boolean;
  error: string | null;
  refreshOrgs?: () => Promise<void>;
  refreshSites: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOrgs = useCallback(async () => {
    try {
      const res = await authApi.listOrgs();
      setOrgs(res.organizations);
      setCurrentOrgId((previous) =>
        previous && res.organizations.some((organization) => organization.orgId === previous)
          ? previous
          : res.organizations[0]?.orgId ?? null,
      );
      setError(null);
    } catch {
      setError("Couldn't load your organizations.");
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setOrgs([]);
      setCurrentOrgId(null);
      setSites([]);
      setCurrentSiteId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void refreshOrgs().finally(() => setLoading(false));
  }, [refreshOrgs, user]);

  const refreshSites = useCallback(async () => {
    if (!currentOrgId) return;
    try {
      const res = await sitesApi.listSites(currentOrgId);
      setSites(res.sites);
      setCurrentSiteId((previous) =>
        previous && res.sites.some((site) => site.id === previous) ? previous : res.sites[0]?.id ?? null,
      );
      setError(null);
    } catch {
      setError("Couldn't load sites for this organization.");
    }
  }, [currentOrgId]);

  useEffect(() => {
    setSites([]);
    setCurrentSiteId(null);
    if (currentOrgId) void refreshSites();
    // refreshSites is stable across the currentOrgId it closes over, safe to omit here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrgId]);

  const currentOrg = orgs.find((o) => o.orgId === currentOrgId) ?? null;
  const currentSite = sites.find((s) => s.id === currentSiteId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        orgs,
        currentOrg,
        setCurrentOrgId,
        sites,
        currentSite,
        setCurrentSiteId,
        loading,
        error,
        refreshOrgs,
        refreshSites,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
