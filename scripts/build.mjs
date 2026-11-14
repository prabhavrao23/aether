import { cp, mkdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/', root), { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js']) {
  await cp(new URL('src/' + file, root), new URL('dist/' + file, root));
}
await cp(new URL('assets/audio/', root), new URL('dist/assets/audio/', root), { recursive: true });
console.log('Built ÆTHER in dist/');
