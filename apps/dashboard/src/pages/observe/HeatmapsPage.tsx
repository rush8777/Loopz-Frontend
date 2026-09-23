import { Badge } from "@movecues/ui";
import { PageHeader } from "../../components/PageHeader";

export function HeatmapsPage() {
  return (
    <>
      <PageHeader
        section="Observe"
        title="Heatmaps"
        description="See where users click, scroll, hover, and focus across your product. Heatmaps are coming soon."
      />
      <section className="rounded-lg border bg-card p-8">
        <Badge variant="secondary">Coming soon</Badge>
        <p className="mt-3 text-sm text-muted-foreground">We're preparing Heatmaps for a future Movcues release.</p>
      </section>
    </>
  );
}
