import { RefreshCw } from "lucide-react";
import { Button } from "@movecues/ui";

export function RefreshButton({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={onRefresh}><RefreshCw className={refreshing ? "animate-spin" : undefined} />{refreshing ? "Refreshing…" : "Refresh"}</Button>;
}
