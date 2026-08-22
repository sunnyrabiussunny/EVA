const BASE = 'http://192.168.10.120:4000/api';

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  
  try {
    const r = await fetch(`${BASE}${path}`, opts);
    if (!r.ok) {
      const errText = await r.text().catch(() => r.status);
      throw new Error(`${method} ${path} → ${r.status}: ${errText}`);
    }
    const text = await r.text();
    if (!text) return {};
    try { return JSON.parse(text); }
    catch { return { raw: text }; }
  } catch (err) {
    console.error('[EVA API Error]', method, path, err.message);
    throw err;
  }
}

export const api = {
  get:  (path)        => req('GET',    path),
  post: (path, body)  => req('POST',   path, body),
  put:  (path, body)  => req('PUT',    path, body),
  del:  (path)        => req('DELETE', path),
};
