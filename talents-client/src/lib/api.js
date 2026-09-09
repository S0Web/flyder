// Wrapper fetch maison, même convention que client/src/lib/api.js — pas
// d'axios/react-query, juste fetch + gestion centralisée du token.
const BASE = '/api';
const TOKEN_KEY = 'talents_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
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
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e = new Error(err.error || res.statusText);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

function qs(params) {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
}

export const api = {
  // Auth coach
  coachSignup: (data) => req('/coach-auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  coachLogin:  (data) => req('/coach-auth/login', { method: 'POST', body: JSON.stringify(data) }),
  coachMe:     () => req('/coach-auth/me'),
  coachLogout: () => req('/coach-auth/logout', { method: 'POST' }),
  updateCoachMe: (data) => req('/coach-auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  // Auth salle
  gymSignup: (data) => req('/gym-auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  gymLogin:  (data) => req('/gym-auth/login', { method: 'POST', body: JSON.stringify(data) }),
  gymMe:     () => req('/gym-auth/me'),
  gymLogout: () => req('/gym-auth/logout', { method: 'POST' }),
  updateGymMe: (data) => req('/gym-auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  // Recherche publique
  searchCoaches: (params) => req(`/search/coaches${qs(params)}`),
  searchGyms:    (params) => req(`/search/gyms${qs(params)}`),

  // Contact
  contact:       (type, id) => req(`/contact/${type}/${id}`, { method: 'POST' }),
  contactStatus: (type, id) => req(`/contact/${type}/${id}/status`),

  // Photo de profil
  uploadPhoto: async (file) => {
    const token = getToken();
    const body = new FormData();
    body.append('photo', file);
    const res = await fetch(`${BASE}/photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },
};
