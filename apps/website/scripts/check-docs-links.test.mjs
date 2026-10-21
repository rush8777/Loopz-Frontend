import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDocsLinks } from './check-docs-links.mjs';

test('checks rendered docs links, fragments and missing prefixes', () => {
  const dist = mkdtempSync(join(tmpdir(), 'movcues-docs-links-'));
  try {
    mkdirSync(join(dist, 'docs/guide'), { recursive: true });
    writeFileSync(join(dist, 'docs/index.html'), '<a href="/docs/guide/#install">Valid</a><a href="/docs/missing/">Missing</a><a href="/docs/guide/#wrong">Bad fragment</a><a href="/getting-started/quickstart/">Legacy link</a><a href="https://example.com">External</a>');
    writeFileSync(join(dist, 'docs/guide/index.html'), '<h2 id="install">Install</h2><a href="../">Docs home</a>');
    const result = checkDocsLinks(dist);
    assert.equal(result.pages, 2);
    assert.equal(result.checked, 5);
    assert.ok(result.failures.some((f) => f.includes('/docs/missing/') && f.includes('missing page')));
    assert.ok(result.failures.some((f) => f.includes('#wrong') && f.includes('missing anchor')));
    assert.ok(result.failures.some((f) => f.includes('missing /docs prefix')));
    assert.ok(!result.failures.some((f) => f.includes('#install')));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});
