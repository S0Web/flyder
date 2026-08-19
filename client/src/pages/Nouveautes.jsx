import { useChangelogUnread } from '../lib/useChangelogUnread';
import ChangelogTab from '../components/ChangelogTab';

export default function Nouveautes() {
  const { refetch } = useChangelogUnread(true);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-800">Nouveautés</h1>
        <p className="text-xs text-gray-400 mt-0.5">Les dernières annonces de l'équipe Flyder.</p>
      </div>
      <ChangelogTab onRead={refetch} />
    </div>
  );
}
