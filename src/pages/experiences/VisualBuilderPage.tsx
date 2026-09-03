import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ExternalLink, Plus } from "lucide-react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import * as experiencesApi from "../../api/experiences";
import type { Experience, ExperienceKind } from "../../types/experiences";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { DataTableFrame, ErrorNotice, LoadingRows, dataTableClass } from "@/components/PageSurface";
import { Button } from "@/components/ui/button";
import { CreateExperienceModal } from "./CreateExperienceModal";

export function VisualBuilderPage() {
  const { currentOrg,currentSite }=useWorkspace(); const navigate=useNavigate(); const [params]=useSearchParams(); const [items,setItems]=useState<Experience[]|null>(null); const [error,setError]=useState<string|null>(params.get("popupBlocked") ? "The popup was blocked. Choose Open live editor below." : null); const [createKind,setCreateKind]=useState<ExperienceKind|null>(null);
  const load=useCallback(()=>{if(!currentOrg||!currentSite)return;experiencesApi.listExperiences(currentOrg.orgId,currentSite.id).then((r)=>setItems(r.experiences.filter((x)=>x.status!=="archived"))).catch(()=>setError("Couldn't load drafts."));},[currentOrg,currentSite]); useEffect(load,[load]);
  async function open(item:Experience){if(!currentOrg||!currentSite)return;try{const session=await experiencesApi.createEditorSession(currentOrg.orgId,currentSite.id,item.id);const popup=window.open(session.launchUrl,"_blank");if(!popup)setError("Allow popups for Loopz, then try again.");}catch(caught){setError(caught instanceof Error?caught.message:"Couldn't open the editor.");}}
  return <><PageHeader section="Experiences" title="Visual Builder" description="Launch the editor on your real product page. The SDK selects and positions elements directly in the host DOM." actions={<div className="flex gap-2"><Button variant="outline" onClick={()=>setCreateKind("guide")}><Plus/>New guide</Button><Button onClick={()=>setCreateKind("widget")}><Plus/>New widget</Button></div>}/><DataTableFrame>{error&&<div className="p-4"><ErrorNotice>{error}</ErrorNotice></div>}{items===null&&<LoadingRows/>}{items?.length===0&&<EmptyState title="No drafts to open" description="Create a guide or widget to begin designing on your live site."/>}{items&&items.length>0&&<table className={dataTableClass}><thead><tr><th>Experience</th><th>Kind</th><th>Build URL</th><th></th></tr></thead><tbody>{items.map((item)=><tr key={item.id}><td className="font-medium" onClick={()=>navigate(`/experiences/${item.id}/edit`)}>{item.name}</td><td>{item.kind}</td><td className="max-w-sm truncate text-muted-foreground">{item.buildUrl}</td><td><Button size="sm" onClick={()=>open(item)}><ExternalLink/>Open live editor</Button></td></tr>)}</tbody></table>}</DataTableFrame>{createKind&&<CreateExperienceModal kind={createKind} open onOpenChange={(open)=>!open&&setCreateKind(null)} onCreated={load}/>}</>;
}

