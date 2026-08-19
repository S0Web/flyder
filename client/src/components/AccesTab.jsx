import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function AccesTab() {
  const toast = useToast();
  const [ips, setIps] = useState([]);
  const [votreIp, setVotreIp] = useState(null);
  const [form, setForm] = useState({ ip: '', label: '' });
  const [saving, setSaving] = useState(false);

  function load() {
    api.getIpAutorisees().then(({ ips, votreIp }) => { setIps(ips); setVotreIp(votreIp); }).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.ip.trim()) return;
    setSaving(true);
    try {
      await api.addIpAutorisee(form.ip.trim(), form.label.trim());
      setForm({ ip: '', label: '' });
      toast.success('IP autorisée ajoutée');
      load();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Retirer cette IP de la liste autorisée ?')) return;
    try {
      await api.deleteIpAutorisee(id);
      load();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
            <b>Manager</b> : Toutes les permissions. <br/><br/>
            <b>Utilisateurs</b> :
            <ul style={{ listStyleType: 'disc', paddingLeft: '1rem', marginTop: '0.25rem' }}>
             <li>Depuis une adresse IP autorisée : Permissions restreintes</li>
             <li>Depuis une adresse IP quelconque : Lecture seule</li>
            </ul>
        </p>
        <br/>
        {votreIp && (
          <p className="text-xs text-gray-400 mt-2">
            Votre adresse IP actuelle : <span className="font-mono text-gray-600">{votreIp}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Adresse IP</label>
          <input value={form.ip} onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
            placeholder={votreIp || '203.0.113.42'}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Libellé (optionnel)</label>
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Wi-Fi de la salle"
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#3D5AFE' }}>
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </form>

      {ips.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">Aucune IP autorisée pour l'instant.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {ips.map((row, i) => (
            <div key={row.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}
              className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="font-mono text-sm text-gray-700">{row.ip}</div>
                {row.label && <div className="text-xs text-gray-400 truncate">{row.label}</div>}
              </div>
              <button onClick={() => handleDelete(row.id)} className="text-xs text-red-500 hover:underline flex-shrink-0">
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
