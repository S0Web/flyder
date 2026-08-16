const BASE = '/api';

function getToken() {
  return localStorage.getItem('flyder_admin_token');
}

async function req(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('flyder_admin_token');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  login:  (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  me:     () => req('/auth/me'),

  getClients:    () => req('/clients'),
  getClient:     (id) => req(`/clients/${id}`),
  createClient:  (data) => req('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient:  (id, data) => req(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient:  (id) => req(`/clients/${id}`, { method: 'DELETE' }),
};
