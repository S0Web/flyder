import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfigProvider } from './context/ConfigContext';
import Layout from './components/Layout';
import ProfilePicker from './pages/ProfilePicker';
import Planning from './pages/Planning';
import PlanningPersonnel from './pages/PlanningPersonnel';
import Coaches from './pages/Coaches';
import Annuaire from './pages/Annuaire';
import Formation from './pages/Formation';
import FormationCategorie from './pages/FormationCategorie';
import Settings from './pages/Settings';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Chargement…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route path="/"                   element={<Planning />} />
        <Route path="/planning-personnel" element={<PlanningPersonnel />} />
        <Route path="/coaches"            element={<Coaches />} />
        <Route path="/annuaire"           element={<Annuaire />} />
        <Route path="/formation"                        element={<Formation />} />
        <Route path="/formation/:categorieId"           element={<FormationCategorie />} />
        <Route path="/formation/:categorieId/:articleId" element={<FormationCategorie />} />
        <Route path="/parametres"         element={<Settings />} />
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<ProfilePickerRoute />} />
              <Route path="/*"     element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ConfigProvider>
  );
}

function ProfilePickerRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <ProfilePicker />;
}
