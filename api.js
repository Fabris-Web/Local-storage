// Frontend API wrapper for FABRIS voting system backend
// Auth-only version (lean and focused)
const API = (() => {
  const base = '';

  async function request(path, opts = {}) {
    const res = await fetch(base + path, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts));
    const text = await res.text();
    try { return JSON.parse(text); } catch (e) { return { success: false, message: text || 'Empty response' }; }
  }

  return {
    auth: {
      register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
      login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
      logout: () => request('/api/auth/logout', { method: 'POST' }),
      me: () => request('/api/auth/me')
    }
  };
})();

window.API = API;
