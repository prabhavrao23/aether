import { cp, mkdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/', root), { recursive: true });
for (const file of ['index.html', 'aether.html', 'home.css', 'home.js', 'styles.css', 'app.js', 'solar.css', 'solar.js', 'surface-effects.js', 'portfolio.html', 'portfolio.css', 'portfolio.js', 'vendor']) {
  await cp(new URL('src/' + file, root), new URL('dist/' + file, root), { recursive: true });
}
await cp(new URL('assets/audio/', root), new URL('dist/assets/audio/', root), { recursive: true });
console.log('Built Prabhav in dist/');

await cp(new URL('assets/planets/', root), new URL('dist/assets/planets/', root), { recursive: true });

await cp(new URL('assets/portfolio/', root), new URL('dist/assets/portfolio/', root), { recursive: true });
