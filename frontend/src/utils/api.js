const BASE = '/api';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  get: (path) => req(path),
  post: (path, body) => req(path, { method: 'POST', body }),
  put: (path, body) => req(path, { method: 'PUT', body }),
  del: (path) => req(path, { method: 'DELETE' }),
};
