import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArticle, fingerprint } from '../scripts/validate-article.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(fs.readFileSync(path.join(dirname, '..', 'examples', 'example-article.json'), 'utf8'));
const clone = (data = sample) => structuredClone(data);
const valid = () => {
  const a = clone();
  a.sanity.author = 'Approved Contributor';
  a.sources = [{ id: 'ref1', url: 'https://www.example.org/specific-reference', publisher: 'Example', accessedAt: '2026-11-21' }];
  a.claims = [{ text: 'This is a definition for illustration', kind: 'definition', sourceIds: ['ref1'] }];
  return a;
};
const gateNames = ['research','facts','originality','voice','product','seo','answer_quality','sanity_schema','browser_preview','accessibility','links','taxonomy_migration'];
const qa = a => ({ articleFingerprint: fingerprint(a), checks: Object.fromEntries(gateNames.map(name => [name, { status:'pass', evidence:['reviewed evidence'] }])), findings:[] });
const approval = a => ({ articleFingerprint: fingerprint(a), sanityDraftId:'drafts.post-1', sanityRevision:'rev-1', approvedBy:'Human Editor', approvedAt:'2026-11-21T12:00:00.000Z', approvalMethod:'human confirmation' });

test('example is blocked because sources and byline are missing', () => {
  const result = validateArticle(sample);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.id === 'byline'));
  assert.ok(result.errors.some(e => e.id === 'claim.0.citation'));
});
test('valid prepared draft passes deterministic checks', () => assert.equal(validateArticle(valid()).ok, true));
test('slug validation rejects path traversal', () => { const a=valid(); a.sanity.slug.current='../oops'; assert.ok(validateArticle(a).errors.some(e=>e.id==='slug')); });
test('slug validation rejects reserved preview', () => { const a=valid(); a.sanity.slug.current='preview'; assert.ok(validateArticle(a).errors.some(e=>e.id==='slug')); });
test('seo title follows real current Sanity max 65', () => { const a=valid(); a.sanity.seoTitle='a'.repeat(66); assert.ok(validateArticle(a).errors.some(e=>e.id==='limit.seoTitle')); });
test('unsupported source ID blocks draft', () => {const a=valid();a.claims[0].sourceIds=['missing'];assert.ok(validateArticle(a).errors.some(e=>e.id==='claim.0.source'));});
test('candidate category warns in draft', () => { const a=valid(); a.sanity.topic='retention';const r=validateArticle(a);assert.equal(r.ok,true);assert.ok(r.warnings.some(x=>x.id==='topic.migration')); });
test('candidate category blocks publishing until CMS migration', () => { const a=valid();a.sanity.topic='retention';assert.ok(validateArticle(a,{stage:'publish',qaReport:qa(a),approval:approval(a)}).errors.some(e=>e.id==='topic.live')); });
test('publish is blocked without QA and explicit approval', () => { const r=validateArticle(valid(),{stage:'publish'});assert.equal(r.ok,false);assert.ok(r.errors.some(e=>e.id==='qa.missing'));assert.ok(r.errors.some(e=>e.id==='approval')); });
test('a local approval record cannot authorize publication', () => {const a=valid();assert.ok(validateArticle(a,{stage:'publish',qaReport:qa(a),approval:approval(a)}).errors.some(e=>e.id==='approval.unverified'));});
test('new article fields invalidate earlier evidence', () => {const a=valid(), hash=fingerprint(a); a.extraField='changed'; assert.notEqual(fingerprint(a),hash);});
test('mutating article invalidates prior approval and QA', () => {const a=valid(),q=qa(a),ap=approval(a); a.bodyMarkdown+=' New factual paragraph'; const r=validateArticle(a,{stage:'publish',qaReport:q,approval:ap});assert.ok(r.errors.some(e=>e.id==='qa.fingerprint'));assert.ok(r.errors.some(e=>e.id==='approval'));});
test('pending QA status blocks publish', () => {const a=valid(),q=qa(a);q.checks.facts.status='pending';assert.ok(validateArticle(a,{stage:'publish',qaReport:q,approval:approval(a)}).errors.some(e=>e.id==='qa.facts'));});
test('unresolved blocker blocks publish', () => {const a=valid(),q=qa(a);q.findings=[{severity:'blocker',status:'open'}];assert.ok(validateArticle(a,{stage:'publish',qaReport:q,approval:approval(a)}).errors.some(e=>e.id==='qa.blockers'));});
test('wrong voice ID is blocked', () => {const a=valid();a.voiceId='unknown';assert.ok(validateArticle(a).errors.some(e=>e.id==='voice'));});
