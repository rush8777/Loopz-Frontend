import test from 'node:test';
import assert from 'node:assert/strict';
import { planMigration } from '../scripts/taxonomy-migration.mjs';

test('plans only missing references and blocks ambiguous categories', () => {
  const posts = [
    { _id:'one', _rev:'r1', topic:'onboarding', slug:{current:'stable-url'} },
    { _id:'two', topic:'feedback', primaryCategory:{_ref:'existing'} },
    { _id:'three', topic:'retention' },
  ];
  const categories = [{_id:'cat1',slug:{current:'onboarding'}},{_id:'drafts.cat2',slug:{current:'retention'}}];
  const result = planMigration(posts, categories);
  assert.equal(result.length, 2); assert.equal(result[0].categoryId, 'cat1');
  assert.equal(result[0].slug, 'stable-url'); assert.equal(result[1].action, 'blocked');
  assert.deepEqual(planMigration([{...posts[0],primaryCategory:{_ref:'cat1'}}], categories), []);
});
