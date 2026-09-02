import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

// Accès support Flyder — page volontairement non référencée (aucun lien nulle
// part dans l'app), pour du débogage ponctuel sans apparaître comme un profil
// de la salle. Voir POST /api/auth/dev-access côté serveur.
export default function DevLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.devAccess(key);
      login(res.token, res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Accès support</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
          <input
            type="password" placeholder="Clé" autoFocus required
            value={key} onChange={e => setKey(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button type="submit" disabled={busy || !key}
            className="w-full text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#3D5AFE' }}>
            {busy ? 'Vérification…' : 'Entrer'}
          </button>
        </form>
      </div>
    </div>
  );
}
