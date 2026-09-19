import { useEffect, useState } from "react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { ElementsTable, mergeElementMetadata } from "../../components/elements/ElementsTable";
import * as elementsApi from "../../api/elements";
import type { CatalogElement } from "../../types/api";

/** Retained as a reusable site-wide view; the legacy route now redirects to Pages. */
export function ElementsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const [elements, setElements] = useState<CatalogElement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    setElements(null);
    setError(null);
    elementsApi.listElements(currentOrg.orgId, currentSite.id)
      .then((result) => setElements(result.elements))
      .catch(() => setError("Couldn't load elements."));
  }, [currentOrg, currentSite]);

  function patchLocal(updated: CatalogElement) {
    setElements((current) => current?.map((element) => element.id === updated.id ? mergeElementMetadata(element, updated) : element) ?? current);
  }

  if (!currentSite) {
    return <><PageHeader section="Observe" title="Elements" /><div className="card"><EmptyState title="No site selected" description="Select a site from the switcher above." /></div></>;
  }

  return <><PageHeader section="Observe" title="Elements" description="Discovered elements across this site." /><ElementsTable elements={elements} error={error} onUpdated={patchLocal} emptyDescription="Discovered elements will appear after the SDK initializes on a page." /></>;
}
