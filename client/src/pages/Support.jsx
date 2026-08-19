import { useTicketsUnreadCount } from '../lib/useTicketsUnreadCount';
import TicketsTab from '../components/TicketsTab';

export default function Support() {
  const { refetch } = useTicketsUnreadCount(true);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-800">Support</h1>
      <TicketsTab onRead={refetch} />
    </div>
  );
}
