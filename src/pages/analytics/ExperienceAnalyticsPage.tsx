import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/auth/WorkspaceContext";
import * as experiencesApi from "@/api/experiences";
import type { ExperienceAnalytics } from "@/types/experiences";
import { PageHeader } from "@/components/PageHeader";

export function ExperienceAnalyticsPage() {
  const { currentOrg, currentSite } = useWorkspace(); const [items, setItems] = useState<ExperienceAnalytics[]>([]); const [days, setDays] = useState(30);
  useEffect(() => { if (!currentOrg || !currentSite) return; const until = new Date(); const since = new Date(until.getTime() - days * 86_400_000); experiencesApi.listExperienceAnalytics(currentOrg.orgId, currentSite.id, { since: since.toISOString(), until: until.toISOString() }).then(result => setItems(result.experiences)); }, [currentOrg, currentSite, days]);
  return <><PageHeader section="Analytics" title="Experience analytics" description="See reach, completion, responses, and drop-off without loading raw events." actions={<select className="h-9 rounded-md border bg-background px-3 text-sm" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>} /><div className="mt-5 grid gap-3">{items.map(item => <Link key={item.experience.id} to={`/experiences/${item.experience.id}/edit`} className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-semibold">{item.experience.name}</h2><p className="text-xs capitalize text-muted-foreground">{item.experience.widgetType === "survey" ? "Survey" : item.experience.kind}</p></div><div className="grid grid-cols-3 gap-8 text-right text-sm"><div><p className="text-muted-foreground">Seen</p><p className="font-semibold">{item.summary.usersSeen.toLocaleString()}</p></div><div><p className="text-muted-foreground">{item.survey ? "Responses" : "Completed"}</p><p className="font-semibold">{(item.survey?.submitted ?? item.summary.completed).toLocaleString()}</p></div><div><p className="text-muted-foreground">{item.survey ? "Response rate" : "Completion"}</p><p className="font-semibold">{item.survey?.responseRate ?? item.summary.completionRate}%</p></div></div></div></Link>)}</div></>;
}
