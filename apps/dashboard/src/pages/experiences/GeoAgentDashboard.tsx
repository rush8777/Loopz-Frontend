import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Input, Label } from "@movcues/ui";
import { Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ApiError } from "@/api/client";
import { createExperience, listExperiences } from "@/api/experiences";
import { listSegments } from "@/api/segments";
import { useWorkspace } from "@/auth/WorkspaceContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ErrorNotice } from "@/components/PageSurface";
import type { Segment } from "@/types/api";
import type { Experience } from "@/types/experiences";
import { geoAgentPages, geoAgentSection, type GeoAgentSection } from "@/lib/geoAgentNavigation";

const GeoAgentEditor = lazy(() => import("./GeoAgentEditor").then(module => ({ default: module.GeoAgentEditor })));
const KnowledgePage = lazy(() => import("../knowledge/KnowledgePage").then(module => ({ default: module.KnowledgePage })));

export function GeoAgentDashboard() {
  const { currentOrg, currentSite } = useWorkspace();
  const section = geoAgentSection(useLocation().pathname) ?? "overview";
  if (!currentOrg || !currentSite) return section === "knowledge" ? <StandaloneKnowledge /> :
    <PageHeader section="Experiences" title="Geo Agent" description="Select a site to manage its Geo Agent." />;

  return <SiteGeoAgentDashboard key={`${currentOrg.orgId}/${currentSite.id}`} orgId={currentOrg.orgId} siteId={currentSite.id}
    siteName={currentSite.name} section={section} editable={currentOrg.role === "ADMIN" || currentOrg.role === "OWNER"} />;
}

function StandaloneKnowledge() {
  return <Suspense fallback={<p role="status">Loading knowledge…</p>}><KnowledgePage /></Suspense>;
}

function SiteGeoAgentDashboard({ orgId, siteId, siteName, section, editable }: {
  orgId: string; siteId: string; siteName: string; section: GeoAgentSection; editable: boolean;
}) {
  const [agents, setAgents] = useState<Experience[] | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentError, setSegmentError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [name, setName] = useState("Geo Agent");
  const [setupError, setSetupError] = useState("");
  const creating = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void listExperiences(orgId, siteId, "widget", "geo_agent").then(({ experiences }) => {
      if (!active) return;
      // Updating, publishing, and pausing must not change the management default.
      setAgents([...experiences].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [orgId, siteId, reload]);

  const hasAgent = Boolean(agents?.length);
  useEffect(() => {
    if (!hasAgent) return;
    let active = true;
    void listSegments(orgId, siteId, { limit: 100 }).then(({ segments }) => {
      if (active) setSegments(segments);
    }).catch(() => { if (active) setSegmentError(true); });
    return () => { active = false; };
  }, [orgId, siteId, hasAgent]);

  async function setup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable || agents?.length !== 0 || creating.current || !name.trim()) return;
    creating.current = true;
    setBusy(true);
    setSetupError("");
    try {
      const agent = await createExperience(orgId, siteId, {
        name: name.trim(), kind: "widget", widgetType: "geo_agent", builderMode: "geo_agent", template: "blank", useBuildPageAsTarget: false,
      });
      setAgents([agent]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.message === "geo_agent_exists") {
        setAgents(null);
        setReload(value => value + 1);
      } else {
        setSetupError(error instanceof Error ? error.message : "Couldn’t set up the Geo Agent. Try again.");
      }
    } finally {
      creating.current = false;
      setBusy(false);
    }
  }

  const primary = agents?.[0];
  const definition = primary?.draftVersion?.definition;
  const loading = <p role="status" className="text-sm text-muted-foreground">Loading Geo Agent…</p>;

  if (agents && primary && definition && "geoAgent" in definition) {
    return <Suspense fallback={loading}>
      <GeoAgentEditor key={primary.id} experience={primary} initial={definition} orgId={orgId} siteId={siteId} segments={segments} editable={editable}
        dashboard={{ siteName, section, KnowledgePage,
          hasOtherAgents: agents.length > 1,
          hasOtherPublishedAgent: agents.slice(1).some(agent => agent.status === "published"),
          segmentError }} />
    </Suspense>;
  }

  if (section === "knowledge") return agents || loadError ? <StandaloneKnowledge /> : loading;
  return <>
    <PageHeader section="Experiences" title="Geo Agent" description={siteName} />
    {loadError ? <div className="space-y-3">
      <ErrorNotice>Couldn’t load the Geo Agent.</ErrorNotice>
      <Button variant="outline" onClick={() => { setLoadError(false); setReload(value => value + 1); }}>Retry</Button>
    </div> : !agents ? loading : primary ? <ErrorNotice>Geo Agent configuration is unavailable.</ErrorNotice> :
      section !== "overview" ? <EmptyState title="Geo Agent setup" description="Open Overview to check setup for this site."
        action={<Link className="font-medium underline underline-offset-4" to={geoAgentPages[0].path}>Open Geo Agent overview</Link>} /> :
      <div className="rounded-lg border bg-card">
        <EmptyState icon={<Sparkles />} title={editable ? "Set up your Geo Agent" : "Geo Agent is ready for setup"}
          description={editable ? "Create a draft assistant for this site. You can add knowledge, skills, and targeting before publishing." : "A workspace administrator can set up the assistant for this site."}
          action={editable && <form className="mt-3 flex w-full max-w-sm flex-col gap-3 text-left" onSubmit={setup}>
            <Label className="grid gap-1.5">Agent name<Input required maxLength={200} disabled={busy} value={name} onChange={event => setName(event.target.value)} /></Label>
            {setupError && <ErrorNotice>{setupError}</ErrorNotice>}
            <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Setting up…" : "Set up Geo Agent"}</Button>
          </form>} />
      </div>}
  </>;
}
