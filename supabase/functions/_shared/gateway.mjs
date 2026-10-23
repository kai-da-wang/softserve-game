// This gateway keeps the existing records and replay validation in one database.
// Only the server contacts Sites; players contact this independent public endpoint.
export const upstreamOrigin = 'https://soft-serve-stack-kai.imjusttrying341.chatgpt.site';
export const browserOrigins = ['https://kai-da-wang.github.io', upstreamOrigin];
const methods = ['GET', 'POST', 'PATCH'];
const routeMethods = [
  [/^\/api\/(leaderboard|health)$/, ['GET']],
  [/^\/api\/profile$/, ['GET', 'PATCH']],
  [/^\/api\/runs$/, ['POST']],
  [/^\/api\/runs\/[0-9a-f-]{36}$/, ['POST']],
];

export function createGateway({fetcher = fetch, upstream = upstreamOrigin, origins = browserOrigins, timeout = 22000} = {}) {
  return async function handle(request) {
    const origin = request.headers.get('Origin');
    const cors = origin && origins.includes(origin) ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': methods.join(', '),
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    } : {};
    const reply = (body, status) => Response.json(body, {status, headers: {...cors, 'Cache-Control': 'no-store'}});
    if (origin && !origins.includes(origin)) return reply({error: 'origin'}, 403);
    if (request.method === 'OPTIONS') {
      const headers = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
      if (!origin || !methods.includes(request.headers.get('Access-Control-Request-Method')) || headers.some(x => !['authorization', 'content-type'].includes(x))) return reply({error: 'preflight'}, 403);
      return new Response(null, {status: 204, headers: cors});
    }
    const url = new URL(request.url), prefix = url.pathname.indexOf('/api/');
    const path = prefix < 0 ? '' : url.pathname.slice(prefix);
    const route = routeMethods.find(([pattern]) => pattern.test(path));
    if (!route) return reply({error: 'not_found'}, 404);
    if (!route[1].includes(request.method)) return reply({error: 'method'}, 405);
    if (url.search.length > 2048 || Number(request.headers.get('Content-Length')) > 900000) return reply({error: 'too_large'}, 413);
    const headers = new Headers({'Origin': upstream, 'Accept': 'application/json'});
    const authorization = request.headers.get('Authorization');
    if (authorization) {
      if (!/^Bearer [a-f0-9]{64}$/.test(authorization)) return reply({error: 'invalid_identity'}, 401);
      headers.set('Authorization', authorization);
    }
    let body;
    if (request.method !== 'GET') {
      body = await request.text();
      if (new TextEncoder().encode(body).byteLength > 900000) return reply({error: 'too_large'}, 413);
      headers.set('Content-Type', 'application/json');
    }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetcher(new URL(path + url.search, upstream), {
        method: request.method, headers, body, signal: controller.signal, redirect: 'error',
      });
      if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Unexpected upstream response');
      return new Response(await response.arrayBuffer(), {status: response.status, headers: {...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}});
    } catch {
      return reply({error: 'unavailable', message: '暂时连不上排行榜，请稍后重试。'}, 503);
    } finally { clearTimeout(timer); }
  };
}
