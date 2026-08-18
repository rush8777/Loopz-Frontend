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
  setCurrentSiteId: (siteId: string) => void;
  loading: boolean;
  error: string | null;
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

  useEffect(() => {
    if (!user) {
      setOrgs([]);
      setCurrentOrgId(null);
      return;
    }
    authApi
      .listOrgs()
      .then((res) => {
        setOrgs(res.organizations);
        if (res.organizations.length > 0) setCurrentOrgId(res.organizations[0].orgId);
      })
      .catch(() => setError("Couldn't load your organizations."))
      .finally(() => setLoading(false));
  }, [user]);

  const refreshSites = useCallback(async () => {
    if (!currentOrgId) return;
    try {
      const res = await sitesApi.listSites(currentOrgId);
      setSites(res.sites);
      setCurrentSiteId((prev) => prev ?? res.sites[0]?.id ?? null);
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
