import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import * as experiencesApi from "../../api/experiences";
import type { Experience, ExperienceKind, WidgetType } from "../../types/experiences";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { DataTableFrame, ErrorNotice, LoadingRows, dataTableClass } from "@/components/PageSurface";
import { Button } from "@movecues/ui";
import { Badge } from "@movecues/ui";
import { formatRelativeTime } from "../../lib/format";
import { CreateExperienceModal } from "./CreateExperienceModal";

interface ExperienceListPageProps {
  kind: ExperienceKind;
  widgetType?: WidgetType;
  singularLabel?: string;
  pluralLabel?: string;
  description?: string;
  unsupported?: boolean;
}

export function ExperienceListPage({ kind, widgetType, singularLabel = kind, pluralLabel = kind === "guide" ? "Guides" : "Widgets", description, unsupported = false }: ExperienceListPageProps) {
  const { currentOrg, currentSite } = useWorkspace(); const navigate = useNavigate(); const [items, setItems] = useState<Experience[] | null>(null); const [error, setError] = useState<string | null>(null); const [creating, setCreating] = useState(false); const [deletingId, setDeletingId] = useState<string | null>(null);
  const load = useCallback(() => { if (unsupported) { setItems([]); return; } if (!currentOrg || !currentSite) return; setItems(null); experiencesApi.listExperiences(currentOrg.orgId, currentSite.id, kind, widgetType).then((r)=>setItems(r.experiences)).catch(()=>setError(`Couldn't load ${pluralLabel.toLowerCase()}.`)); }, [currentOrg, currentSite, kind, pluralLabel, unsupported, widgetType]);
  useEffect(load, [load]);
  async function toggle(item: Experience) { if (!currentOrg || !currentSite) return; try { if (item.status === "published") await experiencesApi.pauseExperience(currentOrg.orgId,currentSite.id,item.id); else await experiencesApi.publishExperience(currentOrg.orgId,currentSite.id,item.id); load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Action failed."); } }
  async function remove(item: Experience) { if (!currentOrg || !currentSite || !window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return; setDeletingId(item.id); setError(null); try { await experiencesApi.deleteExperience(currentOrg.orgId, currentSite.id, item.id); load(); } catch (caught) { setError(caught instanceof Error ? caught.message : `Couldn't delete ${singularLabel.toLowerCase()}.`); } finally { setDeletingId(null); } }
  const collectionDescription = description ?? (kind === "guide" ? "Build multi-step anchored guidance over your real product." : `Deliver ${pluralLabel.toLowerCase()} inside your product.`);
  return <><PageHeader section="Experiences" title={pluralLabel} description={collectionDescription} actions={!unsupported ? <Button onClick={()=>setCreating(true)}><Plus/>Create {singularLabel}</Button> : undefined} />
    <DataTableFrame>{unsupported ? <EmptyState icon={<Sparkles/>} title="Checklists are not available yet." description="Checklist runtime support has not been implemented, so no checklist experiences can be created or shown here yet." /> : <>{error && <div className="p-4"><ErrorNotice>{error}</ErrorNotice></div>}{!error && items === null && <LoadingRows/>}{!error && items?.length === 0 && <EmptyState icon={<Sparkles/>} title={`Create your first ${singularLabel}.`} description={`Design and target a ${singularLabel} directly on your real application.`} action={<Button className="mt-3" onClick={()=>setCreating(true)}>Create {singularLabel}</Button>} />}{!error && items && items.length > 0 && <table className={dataTableClass}><thead><tr><th>Name</th><th>Status</th><th>Targeting</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{items.map((item)=><tr key={item.id}><td className="font-medium text-foreground" onClick={()=>navigate(`/experiences/${item.id}/edit`)}>{item.name}</td><td><Badge variant="outline">{item.status}</Badge></td><td className="text-muted-foreground">{item.draftVersion?.definition.targeting.pageRules.length ? `${item.draftVersion.definition.targeting.pageRules.length} page rule(s)` : "All pages"}</td><td className="text-muted-foreground">{formatRelativeTime(item.updatedAt)}</td><td><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={()=>navigate(`/experiences/${item.id}/edit`)}>Edit</Button><Button variant="ghost" size="sm" onClick={()=>toggle(item)}>{item.status === "published" ? "Pause" : "Publish"}</Button><Button variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${item.name}`} disabled={deletingId === item.id} onClick={()=>void remove(item)}><Trash2 /></Button></div></td></tr>)}</tbody></table>}</>}</DataTableFrame>
    {!unsupported && <CreateExperienceModal kind={kind} widgetType={widgetType} singularLabel={singularLabel} open={creating} onOpenChange={setCreating} onCreated={load}/>}</>;
}
