import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'flyder_admin_token';

export function AuthProvider({ children }) {
  const [admin, setAdmin]     = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.me()
      .then(a => { setAdmin(a); setLoading(false); })
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); setAdmin(null); setLoading(false); });
  }, [token]);

  async function login(email, password) {
    const res = await api.login(email, password);
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setAdmin(res.admin);
  }

  function logout() {
    api.logout().catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
