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
  needsSetup: () => req('/auth/needs-setup'),
  setup:  (data) => req('/auth/setup', { method: 'POST', body: JSON.stringify(data) }),
  login:  (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  me:     () => req('/auth/me'),

  getClients:    () => req('/clients'),
  getClient:     (id) => req(`/clients/${id}`),
  createClient:  (data) => req('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient:  (id, data) => req(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient:  (id) => req(`/clients/${id}`, { method: 'DELETE' }),
  regenerateClientApiKey: (id) => req(`/clients/${id}/regenerate-key`, { method: 'POST' }),
  createCheckoutLink: (id) => req(`/clients/${id}/checkout`, { method: 'POST' }),
  createPortalLink:   (id) => req(`/clients/${id}/portal`, { method: 'POST' }),
  resetClientStripe:  (id) => req(`/clients/${id}/reset-stripe`, { method: 'POST' }),

  getTickets:    (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return req(`/tickets${qs ? `?${qs}` : ''}`);
  },
  getTicket:       (id) => req(`/tickets/${id}`),
  createTicket:    (clientId, message) => req('/tickets', { method: 'POST', body: JSON.stringify({ client_id: clientId, message }) }),
  replyTicket:     (id, corps) => req(`/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ corps }) }),
  setTicketStatut: (id, statut) => req(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ statut }) }),

  getChangelog:   () => req('/changelog'),
  createChangelogEntry: (data) => req('/changelog', { method: 'POST', body: JSON.stringify(data) }),
  updateChangelogEntry: (id, data) => req(`/changelog/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChangelogEntry: (id) => req(`/changelog/${id}`, { method: 'DELETE' }),
};
