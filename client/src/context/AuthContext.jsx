import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { oublierDeverrouillage } from '../lib/deverrouillage';

const AuthContext = createContext(null);

const TOKEN_KEY = 'fm_token';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const switchProfile = useCallback(() => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    oublierDeverrouillage();
    setToken(null);
    setUser(null);
  }, [token]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => { switchProfile(); setLoading(false); });
  }, [token]);

  function login(newToken, newUser) {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }

  async function selectProfile(userId, code) {
    const res = await api.selectProfile(userId, code);
    login(res.token, res.user);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, selectProfile, switchProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
