import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleLanding from './pages/RoleLanding';
import CoachAuth from './pages/CoachAuth';
import CoachProfil from './pages/CoachProfil';
import CoachRecherche from './pages/CoachRecherche';
import GymAuth from './pages/GymAuth';
import GymProfil from './pages/GymProfil';
import GymRecherche from './pages/GymRecherche';
import AdminPage from './pages/AdminPage';

// Une route "AuthPage" (CoachAuth/GymAuth) redirige vers la recherche si on
// est déjà connecté sous le bon rôle ; une route protégée redirige vers la
// page d'auth correspondante si on n'a pas encore de session de ce rôle.
function AuthPage({ role, children }) {
  const { role: currentRole, actor, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (currentRole === role && actor) return <Navigate to={`/${role === 'coach' ? 'coach' : 'salle'}/recherche`} replace />;
  return children;
}

function ProtectedPage({ role, children }) {
  const { role: currentRole, actor, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (currentRole !== role || !actor) return <Navigate to={role === 'coach' ? '/coach' : '/salle'} replace />;
  return children;
}

function LoadingScreen() {
  return <div className="min-h-screen flex items-center justify-center bg-brand-cream text-sm text-brand-slate">Chargement…</div>;
}

function Home() {
  const { role, actor, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (role && actor) return <Navigate to={role === 'coach' ? '/coach/recherche' : '/salle/recherche'} replace />;
  return <RoleLanding />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Non référencée : accès admin par URL directe, voir AdminPage.jsx */}
          <Route path="/admin" element={<AdminPage />} />

          <Route path="/coach" element={<AuthPage role="coach"><CoachAuth /></AuthPage>} />
          <Route path="/coach/profil" element={<ProtectedPage role="coach"><CoachProfil /></ProtectedPage>} />
          <Route path="/coach/recherche" element={<ProtectedPage role="coach"><CoachRecherche /></ProtectedPage>} />

          <Route path="/salle" element={<AuthPage role="gym"><GymAuth /></AuthPage>} />
          <Route path="/salle/profil" element={<ProtectedPage role="gym"><GymProfil /></ProtectedPage>} />
          <Route path="/salle/recherche" element={<ProtectedPage role="gym"><GymRecherche /></ProtectedPage>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
