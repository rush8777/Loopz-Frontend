import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import * as pagesApi from "../../api/pages";
import type { PageRule, PageRuleKind, PageRuleOperator, PageType, PagePreviewResult } from "../../types/api";

const OPERATOR_LABEL: Record<PageRuleOperator, string> = {
  equals: "is exactly",
  starts_with: "starts with",
  ends_with: "ends with",
  contains: "contains",
  matches_pattern: "matches pattern (use * as wildcard)",
};

const PAGE_TYPES: PageType[] = [
  "landing",
  "marketing",
  "dashboard",
  "list",
  "detail",
  "settings",
  "checkout",
  "authentication",
  "pricing",
  "documentation",
  "other",
];

function newRule(overrides: Partial<PageRule> = {}): PageRule {
  return { id: `r${Math.random().toString(36).slice(2, 8)}`, kind: "include", operator: "starts_with", value: "", ...overrides };
}

export function PageEditorPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const { pageId } = useParams<{ pageId?: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(pageId);

  const [loaded, setLoaded] = useState(!isEditing);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [pageType, setPageType] = useState<PageType | "">("");
  const [rules, setRules] = useState<PageRule[]>(() => {
    const prefillPath = searchParams.get("path");
    return prefillPath ? [newRule({ operator: "equals", value: prefillPath })] : [newRule()];
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [preview, setPreview] = useState<PagePreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite || !pageId) return;
    pagesApi.getPage(currentOrg.orgId, currentSite.id, pageId).then((page) => {
      setName(page.name);
      setDescription(page.description ?? "");
      setArea(page.area ?? "");
      setPageType(page.pageType ?? "");
      setRules(page.rules.length > 0 ? page.rules : [newRule()]);
      setLoaded(true);
    });
  }, [currentOrg, currentSite, pageId]);

  function updateRule(id: string, patch: Partial<PageRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }
  function addRule(kind: PageRuleKind) {
    setRules((prev) => [...prev, newRule({ kind })]);
  }

  async function runPreview() {
    if (!currentOrg || !currentSite) return;
    const validRules = rules.filter((r) => r.value.trim().length > 0);
    if (validRules.length === 0) return;
    setPreviewing(true);
    setPreviewError(null);
    try {
      const result = await pagesApi.previewPageRules(currentOrg.orgId, currentSite.id, validRules);
      setPreview(result);
    } catch {
      setPreviewError("Couldn't test these rules - check that at least one include rule has a value.");
    } finally {
      setPreviewing(false);
    }
  }

  async function save() {
    if (!currentOrg || !currentSite || !name.trim()) return;
    const validRules = rules.filter((r) => r.value.trim().length > 0);
    if (validRules.length === 0) {
      setSaveError("Add at least one rule with a value.");
      return;
    }
    if (!validRules.some((r) => r.kind === "include")) {
      setSaveError("At least one rule must be an include rule.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      area: area.trim() || undefined,
      pageType: pageType || undefined,
      rules: validRules,
    };
    try {
      const saved = isEditing
        ? await pagesApi.updatePage(currentOrg.orgId, currentSite.id, pageId!, input)
        : await pagesApi.createPage(currentOrg.orgId, currentSite.id, input);
      navigate(`/observe/pages/${saved.id}`);
    } catch {
      setSaveError("Couldn't save this page - please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!currentSite || !loaded) {
    return (
      <>
        <PageHeader section="Observe" title={isEditing ? "Edit Page" : "Create Page"} />
        <div className="card" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Observe"
        title={isEditing ? "Edit Page" : "Create Page"}
        description="A Page is a logical grouping of URLs, defined by rules - not a single raw URL. Rules are matched against every page_view this site has recorded, so editing them reclassifies historical traffic too."
      />

      <div className="card card-padded" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product Detail" />
        </div>

        <div className="field">
          <label>Description</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Individual product detail pages"
          />
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Area</label>
            <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Commerce" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Page type</label>
            <select className="input" value={pageType} onChange={(e) => setPageType(e.target.value as PageType | "")}>
              <option value="">—</option>
              {PAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>Include rules</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
          A URL matches this Page if it matches at least one include rule (and no exclude rule below).
        </div>
        <RuleList rules={rules.filter((r) => r.kind === "include")} onChange={updateRule} onRemove={removeRule} />
        <button className="btn btn-ghost btn-sm" onClick={() => addRule("include")} style={{ marginTop: 8 }}>
          + Add include rule
        </button>

        <div style={{ fontWeight: 600, fontSize: 13.5, margin: "20px 0 4px" }}>Exclude rules (optional)</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
          A URL that matches any exclude rule is never counted toward this Page, even if it also matches an include rule.
        </div>
        <RuleList rules={rules.filter((r) => r.kind === "exclude")} onChange={updateRule} onRemove={removeRule} />
        <button className="btn btn-ghost btn-sm" onClick={() => addRule("exclude")} style={{ marginTop: 8 }}>
          + Add exclude rule
        </button>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-ghost btn-sm" onClick={runPreview} disabled={previewing}>
            {previewing ? "Testing…" : "Test rules against real traffic"}
          </button>
          {previewError && (
            <div className="error-banner" style={{ marginTop: 10 }}>
              {previewError}
            </div>
          )}
          {preview && !previewError && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                Matches <strong style={{ color: "var(--text-primary)" }}>{preview.metrics.views.toLocaleString()}</strong> views
                across <strong style={{ color: "var(--text-primary)" }}>{preview.matched.length}</strong> URL
                {preview.matched.length === 1 ? "" : "s"}, {preview.metrics.uniqueVisitors.toLocaleString()} unique visitors.
              </div>
              {preview.matched.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {preview.matched.slice(0, 8).map((m) => (
                    <div key={m.pagePath} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span className="mono" style={{ color: "var(--text-primary)" }}>
                        ✓ {m.pagePath}
                      </span>
                      <span className="mono" style={{ color: "var(--text-muted)" }}>
                        {m.views.toLocaleString()} views
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {preview.unmatchedSample.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Not matched (sample):</div>
                  {preview.unmatchedSample.slice(0, 4).map((m) => (
                    <div key={m.pagePath} className="mono" style={{ color: "var(--text-muted)" }}>
                      ✕ {m.pagePath}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="error-banner" style={{ marginBottom: 12 }}>
          {saveError}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : isEditing ? "Save changes" : "Create Page"}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </>
  );
}

function RuleList({
  rules,
  onChange,
  onRemove,
}: {
  rules: PageRule[];
  onChange: (id: string, patch: Partial<PageRule>) => void;
  onRemove: (id: string) => void;
}) {
  if (rules.length === 0) {
    return <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No rules yet.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rules.map((rule) => (
        <div key={rule.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 20 }}>Path</span>
          <select
            className="input"
            style={{ width: 260 }}
            value={rule.operator}
            onChange={(e) => onChange(rule.id, { operator: e.target.value as PageRuleOperator })}
          >
            {(Object.keys(OPERATOR_LABEL) as PageRuleOperator[]).map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABEL[op]}
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ flex: 1 }}
            value={rule.value}
            onChange={(e) => onChange(rule.id, { value: e.target.value })}
            placeholder={rule.operator === "matches_pattern" ? "/products/*" : "/products"}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(rule.id)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
