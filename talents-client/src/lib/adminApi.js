// Client dédié à l'admin : la clé sert directement de Bearer token (pas de
// session), stockée à part de talents_token pour ne jamais mélanger un accès
// admin avec une session coach/salle normale sur le même navigateur.
const BASE = '/api';
const KEY_STORAGE = 'talents_admin_key';

export function getAdminKey() {
  return localStorage.getItem(KEY_STORAGE);
}
export function setAdminKey(key) {
  localStorage.setItem(KEY_STORAGE, key);
}
export function clearAdminKey() {
  localStorage.removeItem(KEY_STORAGE);
}

async function req(path, options = {}) {
  const key = getAdminKey();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e = new Error(err.error || res.statusText);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

export const adminApi = {
  login: (key) => req('/admin/login', { method: 'POST', body: JSON.stringify({ key }) }),
  getCoaches: () => req('/admin/coaches'),
  getGyms: () => req('/admin/gyms'),
  toggleCoachActif: (id, actif) => req(`/admin/coaches/${id}`, { method: 'PATCH', body: JSON.stringify({ actif }) }),
  toggleGymActif: (id, actif) => req(`/admin/gyms/${id}`, { method: 'PATCH', body: JSON.stringify({ actif }) }),
  deleteCoach: (id) => req(`/admin/coaches/${id}`, { method: 'DELETE' }),
  deleteGym: (id) => req(`/admin/gyms/${id}`, { method: 'DELETE' }),
  getContacts: () => req('/admin/contacts'),
};
