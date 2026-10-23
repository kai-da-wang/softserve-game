import {readFile, writeFile} from 'node:fs/promises';
import './build-pages.mjs';

// Render's CDN proxies /api/* to the verified game gateway. The browser uses
// its own site origin, so no request goes directly to a blocked API domain.
const game = new URL('../pages-dist/game/index.html', import.meta.url);
const html = await readFile(game, 'utf8');
await writeFile(game, html.replace(/<meta name="softserve-api-origin"[^>]*>/, ''));
console.log('Render static build ready with same-origin API routes.');
