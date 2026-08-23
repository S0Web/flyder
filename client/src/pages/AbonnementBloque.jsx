import { AlertTriangle } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import logo from '../assets/logo-flyder-light.png';

// Page statique affichée quand l'abonnement de la salle n'est plus actif
// depuis plus de 3 jours (voir server/src/middleware/subscriptionGate.js).
// N'utilise aucune donnée dynamique côté serveur : elle doit rester affichable
// même quand toutes les autres routes de l'API renvoient une erreur.
export default function AbonnementBloque() {
  const { salleNom } = useConfig();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center space-y-4">
        <img src={logo} alt="Flyder" className="h-8 mx-auto" />
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="text-lg font-semibold text-brand-ink">Abonnement inactif</h1>
        <p className="text-sm text-gray-500">
          L'abonnement Flyder {salleNom ? `de ${salleNom} ` : ''}n'est plus actif et l'accès à
          l'application a été suspendu. Contactez votre manager pour régulariser la situation.
        </p>
      </div>
    </div>
  );
}
