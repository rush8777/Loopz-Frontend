import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import * as experiencesApi from "../../api/experiences";
import type { Experience, ExperienceKind } from "../../types/experiences";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { DataTableFrame, ErrorNotice, LoadingRows, dataTableClass } from "@/components/PageSurface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "../../lib/format";
import { CreateExperienceModal } from "./CreateExperienceModal";

export function ExperienceListPage({ kind }: { kind: ExperienceKind }) {
  const { currentOrg, currentSite } = useWorkspace(); const navigate = useNavigate(); const [items, setItems] = useState<Experience[] | null>(null); const [error, setError] = useState<string | null>(null); const [creating, setCreating] = useState(false);
  const load = useCallback(() => { if (!currentOrg || !currentSite) return; setItems(null); experiencesApi.listExperiences(currentOrg.orgId, currentSite.id, kind).then((r)=>setItems(r.experiences)).catch(()=>setError(`Couldn't load ${kind}s.`)); }, [currentOrg, currentSite, kind]);
  useEffect(load, [load]); const plural = kind === "guide" ? "Guides" : "Widgets";
  async function toggle(item: Experience) { if (!currentOrg || !currentSite) return; try { if (item.status === "published") await experiencesApi.pauseExperience(currentOrg.orgId,currentSite.id,item.id); else await experiencesApi.publishExperience(currentOrg.orgId,currentSite.id,item.id); load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Action failed."); } }
  async function preview(item: Experience) { if (!currentOrg || !currentSite) return; try { const session = await experiencesApi.createEditorSession(currentOrg.orgId, currentSite.id, item.id); if (!window.open(session.launchUrl, "_blank")) navigate(`/experiences/builder?experienceId=${item.id}&popupBlocked=1`); } catch (caught) { setError(caught instanceof Error ? caught.message : "Preview failed."); } }
  return <><PageHeader section="Experiences" title={plural} description={kind === "guide" ? "Build multi-step anchored guidance over your real product." : "Deliver focused cards and toasts inside your product."} actions={<Button onClick={()=>setCreating(true)}><Plus/>Create {kind}</Button>} />
    <DataTableFrame>{error && <div className="p-4"><ErrorNotice>{error}</ErrorNotice></div>}{!error && items === null && <LoadingRows/>}{!error && items?.length === 0 && <EmptyState icon={<Sparkles/>} title={`Create your first ${kind}.`} description={`Design and target a ${kind} directly on your real application.`} action={<Button className="mt-3" onClick={()=>setCreating(true)}>Create {kind}</Button>} />}{!error && items && items.length > 0 && <table className={dataTableClass}><thead><tr><th>Name</th>{kind === "widget" && <th>Type</th>}<th>Status</th><th>Targeting</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{items.map((item)=><tr key={item.id}><td className="font-medium text-foreground" onClick={()=>navigate(`/experiences/${item.id}/edit`)}>{item.name}</td>{kind === "widget" && <td>{item.widgetType?.replaceAll("_"," ")}</td>}<td><Badge variant="outline">{item.status}</Badge></td><td className="text-muted-foreground">{item.draftVersion?.definition.targeting.pageRules.length ? `${item.draftVersion.definition.targeting.pageRules.length} page rule(s)` : "All pages"}</td><td className="text-muted-foreground">{formatRelativeTime(item.updatedAt)}</td><td><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={()=>navigate(`/experiences/${item.id}/edit`)}>Edit</Button><Button variant="ghost" size="sm" onClick={()=>preview(item)}>Preview</Button><Button variant="ghost" size="sm" onClick={()=>toggle(item)}>{item.status === "published" ? "Pause" : "Publish"}</Button></div></td></tr>)}</tbody></table>}</DataTableFrame>
    <CreateExperienceModal kind={kind} open={creating} onOpenChange={setCreating} onCreated={load}/></>;
}
