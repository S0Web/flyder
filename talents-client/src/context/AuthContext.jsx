import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'talents_token';
const ROLE_KEY = 'talents_role'; // 'coach' | 'gym'

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY));
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    // Invalide aussi la session côté serveur (au mieux : si ça échoue, le token
    // local est de toute façon effacé et expire seul au bout de 90 jours).
    const r = localStorage.getItem(ROLE_KEY);
    if (localStorage.getItem(TOKEN_KEY)) {
      (r === 'coach' ? api.coachLogout : api.gymLogout)().catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    setToken(null);
    setRole(null);
    setActor(null);
  }, []);

  useEffect(() => {
    if (!token || !role) { setLoading(false); return; }
    const fetchMe = role === 'coach' ? api.coachMe : api.gymMe;
    fetchMe()
      .then((a) => { setActor(a); setLoading(false); })
      .catch((err) => {
        // Seule une session réellement invalide (401) déconnecte : une coupure
        // réseau ou un serveur en redémarrage ne doit pas effacer le token.
        if (err.status === 401) logout();
        setLoading(false);
      });
  }, [token, role, logout]);

  function login(newRole, newToken, newActor) {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(ROLE_KEY, newRole);
    setToken(newToken);
    setRole(newRole);
    setActor(newActor);
  }

  function updateActor(patch) {
    setActor((a) => ({ ...a, ...patch }));
  }

  return (
    <AuthContext.Provider value={{ role, token, actor, login, logout, updateActor, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
