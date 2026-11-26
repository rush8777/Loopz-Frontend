import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const voices = new Set(['analyst', 'founder', 'practitioner']);
export function extractArticle(html) {
  if (typeof html !== 'string' || !html.trim()) throw new Error('Empty reference');
  const doc = new JSDOM(html).window.document;
  const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.querySelector('title')?.textContent?.trim() || '';
  const author = doc.querySelector('meta[name="author"]')?.getAttribute('content') || '';
  const publishedAt = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || '';
  doc.querySelectorAll('script,style,nav,aside,header,footer,form,iframe,[role="navigation"],.ad,.ads,.advertisement').forEach(node => node.remove());
  const main = doc.querySelector('article') || doc.querySelector('main') || doc.querySelector('[role="main"]') || doc.querySelector('.page__content.page-content-style');
  if (!main) throw new Error('No article or main element; extract the main text manually');
  const text = main.textContent.replace(/\s+/g, ' ').trim();
  if (!text) throw new Error('Reference has no article text');
  return { title, author, publishedAt, text };
}
export function features(text) {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  return { sentences: sentences.length, averageWordsPerSentence: sentences.length ? words.length / sentences.length : 0,
    questions: (text.match(/\?/g) || []).length, hasCitations: /https?:\/\/|\[[0-9]+\]/.test(text) };
}
export function importReference({ voice, url, html, permission, store = path.join(root, 'private-references') }) {
  if (!voices.has(voice)) throw new Error('Unknown voice');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('A public HTTPS source URL is required');
  if (permission !== 'permitted') throw new Error('Import requires permission to store and analyze this reference');
  const extracted = extractArticle(html);
  const hash = crypto.createHash('sha256').update(extracted.text).digest('hex');
  const dir = path.join(store, voice); fs.mkdirSync(dir, { recursive: true });
  const indexPath = path.join(dir, 'index.json');
  const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : [];
  if (index.some(item => item.url === parsed.href || item.sha256 === hash)) throw new Error('Duplicate reference');
  const metadata = { url: parsed.href, title: extracted.title, sourceAuthor: extracted.author, publishedAt: extracted.publishedAt, sha256: hash, permission, importedAt: new Date().toISOString(), features: features(extracted.text) };
  fs.writeFileSync(path.join(dir, `${hash}.txt`), extracted.text, { flag: 'wx' });
  index.push(metadata); fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  return metadata;
}
export function profile(index) {
  const train = index.slice(0, 15); const holdout = index.slice(15, 20);
  return { trainingCount: train.length, holdoutCount: holdout.length,
    averageWordsPerSentence: train.length ? train.reduce((sum, item) => sum + item.features.averageWordsPerSentence, 0) / train.length : null,
    trainingEvidence: train.map(({url,sha256}) => ({url,sha256})), holdoutEvidence: holdout.map(({url,sha256}) => ({url,sha256})),
    note: 'Broad descriptive evidence only; do not imitate distinctive wording or identity.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, voice, filename, url, permission] = process.argv.slice(2);
    if (command === 'import') console.log(JSON.stringify(importReference({ voice, html: fs.readFileSync(filename, 'utf8'), url, permission }), null, 2));
    else if (command === 'profile' && voices.has(voice)) {
      const index = path.join(root, 'private-references', voice, 'index.json');
      const result=profile(fs.existsSync(index) ? JSON.parse(fs.readFileSync(index, 'utf8')) : []);
      if (!fs.existsSync(index)) throw new Error('No references imported for this voice');
      fs.writeFileSync(path.join(path.dirname(index),'profile.json'),JSON.stringify(result,null,2));
      console.log(JSON.stringify(result, null, 2));
    } else throw new Error('Usage: references.mjs import VOICE FILE URL permitted | profile VOICE');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
