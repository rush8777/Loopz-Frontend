import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractArticle, importReference, profile } from '../scripts/references.mjs';

test('extracts article and excludes navigation and ads from malformed HTML', () => {
  const result = extractArticle('<title>Example</title><nav>menu</nav><article><p>Useful text<aside>ad</aside><script>bad</script>More');
  assert.equal(result.title, 'Example'); assert.match(result.text, /Useful text/); assert.doesNotMatch(result.text, /menu|bad|ad/);
});
test('requires an identifiable article and permission', () => {
  assert.throws(() => extractArticle('<div>missing</div>'), /No article/);
  assert.throws(() => importReference({voice:'analyst',url:'https://example.com',html:'<article>Text</article>'}), /permission/);
});
test('deduplicates sources and keeps authors separate', () => {
  const store = fs.mkdtempSync(path.join(os.tmpdir(), 'movcues-ref-'));
  try {
    const args = {voice:'analyst',url:'https://example.com/a',html:'<article>A useful text.</article>',permission:'permitted',store};
    importReference(args); assert.throws(() => importReference(args), /Duplicate/);
    importReference({...args, voice:'founder'});
    const index = JSON.parse(fs.readFileSync(path.join(store,'analyst','index.json')));
    assert.equal(profile(index).trainingCount, 1); assert.equal(profile(index).holdoutCount, 0);
  } finally { fs.rmSync(store, { recursive:true, force:true }); }
});
