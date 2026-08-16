import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo-flyder-dark.png';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-ink px-4">
      <img src={logo} alt="Flyder" className="h-8 object-contain mb-2" />
      <p className="text-brand-slate text-sm mb-8">Back-office</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full text-white rounded py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#3D5AFE' }}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
