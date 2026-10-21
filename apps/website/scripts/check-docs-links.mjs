import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Check the rendered HTML, including sidebar, cards, pagination and article links.
// No network required. A link to /privacy/ must not silently replace /docs/privacy/.
export function checkDocsLinks(dist) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) files.push(file);
    }
  };
  if (!existsSync(join(dist, 'docs/index.html'))) throw new Error('Build the website before checking docs links.');
  walk(join(dist, 'docs'));
  const failures = [];
  let checked = 0;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const page = '/' + relative(dist, file).replace(/index\.html$/, '');
    for (const match of source.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
      const href = match[1].replaceAll('&amp;', '&');
      const url = new URL(href, `https://movcues.com${page}`);
      if (url.origin !== 'https://movcues.com') continue;
      checked++;
      const pathname = decodeURIComponent(url.pathname);
      const target = resolve(dist, '.' + pathname);
      const html = existsSync(target) && statSync(target).isFile() ? target : join(target, 'index.html');
      if (!existsSync(html)) failures.push(`${page} → ${href} (missing page)`);
      else if (url.hash && html.endsWith('.html')) {
        const fragment = decodeURIComponent(url.hash.slice(1));
        const targetHtml = readFileSync(html, 'utf8');
        const ids = [...targetHtml.matchAll(/\bid="([^"]*)"/g)].map((m) => m[1]);
        if (!ids.includes(fragment)) failures.push(`${page} → ${href} (missing anchor)`);
      }
      if (/^\/(getting-started|integrations|tracking|reference|configuration|api|troubleshooting)(\/|$)/.test(pathname)) {
        failures.push(`${page} → ${href} (missing /docs prefix)`);
      }
    }
  }
  return { pages: files.length, checked, failures: [...new Set(failures)] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkDocsLinks(fileURLToPath(new URL('../dist/', import.meta.url)));
  if (result.failures.length) {
    console.error(result.failures.join('\n'));
    process.exitCode = 1;
  } else console.log(`Docs links OK: ${result.pages} pages, ${result.checked} internal links and anchors checked.`);
}
