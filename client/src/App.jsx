import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfigProvider } from './context/ConfigContext';
import Layout from './components/Layout';
import ProfilePicker from './pages/ProfilePicker';
import Planning from './pages/Planning';

// Chargées à la demande plutôt qu'au démarrage : Planning (page d'atterrissage
// la plus courante après connexion) et ProfilePicker (premier écran affiché)
// restent en import statique, tout le reste n'est téléchargé que si l'utilisateur
// visite effectivement cette page — sensible sur tablette/mobile en 4G faible.
const PlanningPersonnel  = lazy(() => import('./pages/PlanningPersonnel'));
const Coaches            = lazy(() => import('./pages/Coaches'));
const Analyse             = lazy(() => import('./pages/Analyse'));
const Annuaire            = lazy(() => import('./pages/Annuaire'));
const Formation           = lazy(() => import('./pages/Formation'));
const FormationCategorie  = lazy(() => import('./pages/FormationCategorie'));
const Documentation       = lazy(() => import('./pages/Documentation'));
const Settings            = lazy(() => import('./pages/Settings'));
const EquipeLayout        = lazy(() => import('./pages/equipe/EquipeLayout'));
const VueEnsemble         = lazy(() => import('./pages/equipe/VueEnsemble'));
const MaJournee           = lazy(() => import('./pages/equipe/MaJournee'));
const Taches              = lazy(() => import('./pages/equipe/Taches'));
const ComptesRendus       = lazy(() => import('./pages/equipe/ComptesRendus'));
const Membres             = lazy(() => import('./pages/equipe/Membres'));
const FicheMembre         = lazy(() => import('./pages/equipe/FicheMembre'));
const Nouveautes          = lazy(() => import('./pages/Nouveautes'));
const Support             = lazy(() => import('./pages/Support'));
const AbonnementBloque    = lazy(() => import('./pages/AbonnementBloque'));
const DevLogin            = lazy(() => import('./pages/DevLogin'));

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-gray-400 text-sm">
      Chargement…
    </div>
  );
}

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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/"                   element={<Planning />} />
          {/* Équipe : remplace « Planning personnel » (ancienne URL redirigée). */}
          <Route path="/equipe" element={<EquipeLayout />}>
            <Route index element={<EquipeAccueil />} />
            <Route path="ma-journee" element={<MaJournee />} />
            <Route path="planning" element={<PlanningPersonnel />} />
            <Route path="taches" element={<Taches />} />
            <Route path="comptes-rendus" element={<ComptesRendus />} />
            <Route path="membres" element={<MembresOuMaFiche />} />
            <Route path="membres/:id" element={<FicheMembre />} />
          </Route>
          <Route path="/planning-personnel" element={<Navigate to="/equipe/planning" replace />} />
          <Route path="/coachs"             element={<Coaches />} />
          {/* Anciennes URL : des raccourcis/onglets ouverts pointent encore dessus. */}
          <Route path="/coaches"            element={<Navigate to="/coachs" replace />} />
          <Route path="/recapitulatif"      element={<Navigate to="/coachs" replace />} />
          <Route path="/analyse"            element={<Analyse />} />
          <Route path="/annuaire"           element={<Annuaire />} />
          <Route path="/formation"                        element={<Formation />} />
          <Route path="/formation/:categorieId"           element={<FormationCategorie />} />
          <Route path="/formation/:categorieId/:articleId" element={<FormationCategorie />} />
          <Route path="/documentation"            element={<Documentation />} />
          <Route path="/documentation/:articleId" element={<Documentation />} />
          <Route path="/support"            element={<Support />} />
          <Route path="/nouveautes"         element={<Nouveautes />} />
          <Route path="/parametres"         element={<Settings />} />
          <Route path="/parametres/utilisateurs/:id" element={<RedirectionFiche />} />
          <Route path="*"                   element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<ProfilePickerRoute />} />
                {/* Non référencée : accès support Flyder, voir DevLogin.jsx */}
                <Route path="/login/dev" element={<DevLogin />} />
                <Route path="/abonnement-bloque" element={<AbonnementBloque />} />
                <Route path="/*"     element={<ProtectedRoutes />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ConfigProvider>
  );
}

// Accueil de l'onglet Équipe : vue d'ensemble pour un manager, sa journée sinon.
function EquipeAccueil() {
  const { user } = useAuth();
  return user?.role === 'manager' ? <VueEnsemble /> : <MaJournee />;
}

function MembresOuMaFiche() {
  const { user } = useAuth();
  return user?.role === 'manager' ? <Membres /> : <Navigate to={`/equipe/membres/${user?.id}`} replace />;
}

// Les fiches salariés vivaient sous Paramètres : liens et favoris existants.
function RedirectionFiche() {
  const { id } = useParams();
  return <Navigate to={`/equipe/membres/${id}`} replace />;
}

function ProfilePickerRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <ProfilePicker />;
}
