import type { ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { Activity, LayoutGrid, Users, MessageSquare, ChevronDown, ArrowLeft, SlidersHorizontal } from "lucide-react";
export function Brand({ large = false }: { large?: boolean }) { return <div className={`brand ${large ? "brand-large" : ""}`}><Img src={staticFile("movcues-logo.png")} alt="Movcues" style={{ width: large ? 560 : 200, height: "auto" }} /></div>; }
export function ShotLabel({ number, title, subtitle }: { number: string; title: string; subtitle: string }) { return <div className="shot-label"><span>{number ? `${number} / ` : ""}{title}</span><p>{subtitle}</p></div>; }
export function MovcuesInterface({ section, title, subtitle, children }: { section: string; title: string; subtitle: string; children: ReactNode }) {
  return <div className="product-window"><div className="product-top"><Brand /><span className="workspace-select">Acme Workspace <ChevronDown size={18} /></span><span className="top-user">JD</span></div>
    <div className="product-layout"><aside className="product-sidebar"><small>YOUR PRODUCT</small>{[[Activity, "Analytics"], [Users, "Audiences"], [MessageSquare, "Experiences"], [LayoutGrid, "Dashboards"]].map(([Icon, text]) => { const Component = Icon as typeof Activity; return <div key={String(text)} className={section === text ? "selected" : ""}><Component size={24} />{String(text)}</div>; })}<div className="sidebar-site"><span className="status-dot" /> movcues.com</div></aside>
      <main className="product-main"><div className="product-breadcrumb"><ArrowLeft size={18} />{section}<span>/</span><strong>{title}</strong><SlidersHorizontal size={20} /></div><div className="product-title"><div><h2>{title}</h2><p>{subtitle}</p></div><span className="date-range">Last 30 days <ChevronDown size={17} /></span></div>{children}</main></div>
  </div>;
}
