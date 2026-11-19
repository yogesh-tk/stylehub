const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export async function api(path, opts = {}) {
    const isForm = opts.body instanceof FormData;
    const h = { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(opts.headers || {}) }, t = localStorage.getItem('sh_token');
    if (t) h.Authorization = 'Bearer ' + t;
    const r = await fetch(BASE + path, { ...opts, headers: h }), d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.message || 'Request failed'); return d
}
export { BASE };
