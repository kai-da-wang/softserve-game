const identityKey = 'softserve.identity.v1';

function guestSecret(storage, cryptoProvider) {
  let token;
  try { token = storage?.getItem(identityKey); } catch {}
  if (!/^[a-f0-9]{64}$/.test(token || '')) {
    token = Array.from(cryptoProvider.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    try { storage?.setItem(identityKey, token); } catch {}
  }
  return token;
}

export function createGameApi({base, origin, storage, fetcher = fetch, cryptoProvider = crypto}) {
  const endpoint = new URL(base, origin);
  if (endpoint.protocol !== 'https:' && endpoint.origin !== origin) throw new Error('Invalid API endpoint');
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error('Invalid API endpoint');
  const token = guestSecret(storage, cryptoProvider);
  return async function request(path, {method = 'GET', body, timeout = 12000} = {}) {
    if (!path.startsWith('/api/') || path.includes('://')) throw new Error('Invalid API path');
    const url = new URL(endpoint);
    const relative = new URL(path, 'https://game.invalid');
    url.pathname = endpoint.pathname.replace(/\/$/, '') + relative.pathname;
    url.search = relative.search;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetcher(url, {
        method,
        credentials: endpoint.origin === origin ? 'same-origin' : 'omit',
        headers: {'Authorization': 'Bearer ' + token, ...(body === undefined ? {} : {'Content-Type': 'application/json'})},
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      let data;
      try { data = await response.json(); } catch { throw new Error('Invalid API response'); }
      if (!response.ok) {
        const error = new Error(data.message || 'API unavailable');
        error.status = response.status;
        error.code = data.error;
        throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  };
}
