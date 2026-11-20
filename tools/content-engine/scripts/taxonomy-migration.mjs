// Read-only migration planner. Apply changes deliberately in Studio after review.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function planMigration(posts, categories) {
  return posts.filter(post => !post.primaryCategory && post.topic).map(post => {
    const matches = categories.filter(category => category.slug?.current === post.topic && category._id && !category._id.startsWith('drafts.'));
    return { id: post._id, revision: post._rev, topic: post.topic, slug: post.slug?.current,
      categoryId: matches.length === 1 ? matches[0]._id : null,
      action: matches.length === 1 ? 'review-reference' : 'blocked',
      reason: matches.length === 1 ? 'Set primaryCategory only if revision still matches; retain topic and slug.' : 'Expected exactly one published category with this slug.' };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    console.log(JSON.stringify({ dryRun: true, changes: planMigration(data.posts, data.categories) }, null, 2));
  } catch (error) { console.error(`Usage: node taxonomy-migration.mjs export.json (posts and categories arrays): ${error.message}`); process.exitCode = 1; }
}
