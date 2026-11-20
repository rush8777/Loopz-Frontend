import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config', 'engine.json'), 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, 'config', 'taxonomy.json'), 'utf8'));
const gates = JSON.parse(fs.readFileSync(path.join(root, 'config', 'quality-gates.json'), 'utf8'));
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validStatuses = new Set(['pass', 'fail', 'pending', 'manual']);

export function fingerprint(article) {
  // Bind approval evidence to every field, including fields added in future.
  const canonical = value => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
  return crypto.createHash('sha256').update(JSON.stringify(canonical(article))).digest('hex');
}

export function validateArticle(article, { stage = 'draft', qaReport, approval } = {}) {
  const errors = [];
  const warnings = [];
  const fail = (id, message) => errors.push({ id, message });
  const warn = (id, message) => warnings.push({ id, message });
  if (!article || typeof article !== 'object' || Array.isArray(article)) {
    return { ok: false, errors: [{ id: 'object', message: 'Input must be an article JSON object' }], warnings, fingerprint: null };
  }
  if (!config.voices.includes(article.voiceId)) fail('voice', 'Select existing voiceId: ' + config.voices.join(', '));
  for (const key of ['primaryKeyword', 'searchIntent', 'uniqueContribution', 'bodyMarkdown']) {
    if (typeof article[key] !== 'string' || !article[key].trim()) fail(key, `Missing ${key}`);
  }
  const fields = article.sanity;
  if (!fields || typeof fields !== 'object') fail('sanity', 'Missing sanity document fields');
  const f = fields ?? {};
  const limits = config.seoFieldLimits;
  for (const key of ['title', 'summary', 'author']) {
    if (typeof f[key] !== 'string' || !f[key].trim()) fail(`sanity.${key}`, `Missing ${key}`);
  }
  for (const [key, maximum] of Object.entries(limits)) {
    if (key === 'slug') continue;
    if (typeof f[key] === 'string' && f[key].length > maximum) fail(`limit.${key}`, `${key} exceeds Sanity schema max ${maximum}`);
  }
  const slug = f?.slug?.current;
  if (typeof slug !== 'string' || slug.length > limits.slug || slug === 'preview' || !validSlug.test(slug)) {
    fail('slug', 'Invalid slug (letters/numbers/hyphens, ≤96 characters, not preview)');
  }
  if (typeof f.publishedAt !== 'string' || !Number.isFinite(Date.parse(f.publishedAt))) fail('publishedAt', 'Missing/invalid publishedAt datetime');
  const known = new Set(taxonomy.proposedCategories.map(c => c.slug));
  const live = new Set(taxonomy.liveCategorySlugs);
  if (typeof f.topic !== 'string' || !known.has(f.topic)) fail('topic', 'Unknown primary topic; inspect taxonomy and CMS');
  else if (!live.has(f.topic)) {
    if (stage === 'publish') fail('topic.live', 'Category not migrated to live Sanity + website; cannot publish');
    else warn('topic.migration', 'Candidate category requires Sanity + website taxonomy migration before publishing');
  }
  if (!Array.isArray(article.topicTags) || article.topicTags.some(t => typeof t !== 'string' || !t.trim())) fail('tags', 'topicTags must be array of nonempty strings');
  if (!Array.isArray(article.sources)) fail('sources', 'sources must be an array');
  if (!Array.isArray(article.claims)) fail('claims', 'claims must be an array');
  const sources = new Map((Array.isArray(article.sources) ? article.sources : []).filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
  for (const [i, s] of (Array.isArray(article.sources) ? article.sources : []).entries()) {
    if (!s || !s.id || !/^https:\/\//i.test(s.url ?? '')) fail(`source.${i}`, 'Each source needs ID and HTTPS URL');
  }
  for (const [i, claim] of (Array.isArray(article.claims) ? article.claims : []).entries()) {
    if (!claim || !claim.text) fail(`claim.${i}`, 'Claim requires text');
    if (claim?.kind === 'hypothetical') continue;
    if (!Array.isArray(claim?.sourceIds) || !claim.sourceIds.length) {
      // Definitions need verification too; do not make them silently pass without references.
      fail(`claim.${i}.citation`, 'Non-hypothetical claim is missing source IDs');
    } else for (const sourceId of claim.sourceIds) if (!sources.has(sourceId)) fail(`claim.${i}.source`, `Unknown source ID: ${sourceId}`);
  }
  if ((article.bodyMarkdown ?? '').length < 350) warn('depth', 'Very short draft; check whether it fully satisfies intent (not an SEO word-count target)');
  if (/PENDING REAL BYLINE|INSERT AUTHOR|TBD/i.test(f.author ?? '')) fail('byline', 'Replace placeholder with approved real byline');
  const hash = fingerprint(article);
  if (stage === 'publish') {
    // A JSON file cannot authenticate its author or prove a separate instruction.
    // Publishing must be gated by an interactive workflow that verifies both.
    fail('approval.unverified', 'Local approval records cannot authenticate human approval or a separate publish instruction; publication is disabled');
    if (!qaReport || typeof qaReport !== 'object') fail('qa.missing', 'Independent QA report required to publish');
    else {
      if (qaReport.articleFingerprint !== hash) fail('qa.fingerprint', 'QA report does not match current content fingerprint');
      for (const entry of gates.requiredForPublish) {
        const check = qaReport?.checks?.[entry.id];
        if (!check || !validStatuses.has(check.status) || check.status !== 'pass' || !Array.isArray(check.evidence) || check.evidence.length === 0) {
          fail(`qa.${entry.id}`, `QA gate ${entry.id} has no documented PASS`);
        }
      }
      if ((qaReport.findings ?? []).some(f => f.severity === 'blocker' && f.status !== 'resolved')) fail('qa.blockers', 'Unresolved blocking findings remain');
    }
    if (!approval || approval.articleFingerprint !== hash || !approval.sanityDraftId || !approval.sanityRevision || !approval.approvedAt || !approval.approvedBy || !approval.approvalMethod) {
      fail('approval', 'Explicit human approval of this exact revision, Sanity ID, revision and method required');
    }
  }
  return { ok: errors.length === 0, stage, errors, warnings, fingerprint: hash };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [filename, ...flags] = process.argv.slice(2);
  if (!filename) {
    console.error('Usage: node scripts/validate-article.mjs ARTICLE.json [--stage=publish --qa=qa-report.json --approval=approval.json]');
    process.exit(2);
  }
  try {
    const getFlag = (name) => flags.find(flag => flag.startsWith(`--${name}=`))?.slice(name.length + 3);
    const load = (p) => p ? JSON.parse(fs.readFileSync(p, 'utf8')) : undefined;
    const report = validateArticle(load(filename), {
      stage: getFlag('stage') === 'publish' ? 'publish' : 'draft',
      qaReport: load(getFlag('qa')),
      approval: load(getFlag('approval')),
    });
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
