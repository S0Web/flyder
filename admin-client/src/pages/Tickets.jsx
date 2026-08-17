import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Send, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import AdminLayout from '../components/AdminLayout';

const STATUT_TICKET = {
  ouvert: { label: 'Ouvert', bg: 'bg-amber-100', text: 'text-amber-700' },
  resolu: { label: 'Résolu', bg: 'bg-green-100', text: 'text-green-700' },
};

function fmtCourt(iso) {
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function fmtLong(iso) {
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Nouveau ticket (toi qui ouvres, pour une salle choisie) ─────────────────
function NouveauTicketModal({ clients, onCreated, onClose }) {
  const [clientId, setClientId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clientId || !message.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await onCreated(Number(clientId), message.trim());
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Nouveau ticket</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Salle *</label>
            <select required value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
              <option value="">— Choisir —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <textarea
            autoFocus rows={5} value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Décris le message à envoyer…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving || !clientId || !message.trim()}
              className="flex-1 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#3D5AFE' }}>
              {saving ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Conversation ─────────────────────────────────────────────────────────────
// Toi à gauche (toujours "Flyder"), la salle à droite — quel que soit le
// profil de la salle qui a répondu, son prénom reste affiché sous le message.
function ConversationModal({ ticketId, onClose, onChanged }) {
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.getTicket(ticketId).then(t => { setTicket(t); onChanged(); }).catch(err => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const updated = await api.replyTicket(ticketId, reply.trim());
      setTicket(t => ({ ...updated, client: t.client }));
      setReply('');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function toggleStatut() {
    const nouveauStatut = ticket.statut === 'ouvert' ? 'resolu' : 'ouvert';
    setToggling(true);
    try {
      await api.setTicketStatut(ticketId, nouveauStatut);
      setTicket(t => ({ ...t, statut: nouveauStatut }));
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(false);
    }
  }

  const statutCfg = ticket ? STATUT_TICKET[ticket.statut] : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 border-b flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="text-xs text-gray-400 mb-0.5">{ticket?.client?.nom}</div>
            <h2 className="text-sm font-bold text-gray-800 truncate">{ticket?.sujet || 'Conversation'}</h2>
            {statutCfg && (
              <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${statutCfg.bg} ${statutCfg.text}`}>
                {statutCfg.label}
              </span>
            )}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
          {!ticket && !error && <p className="text-sm text-gray-400 text-center py-6">Chargement…</p>}
          {ticket?.messages.map(m => (
            <div key={m.id} className={`flex flex-col ${m.auteur_role === 'admin' ? 'items-start' : 'items-end'}`}>
              <div className={`rounded-xl px-3 py-2 max-w-[85%] ${m.auteur_role === 'admin' ? 'bg-sky-50 text-gray-800' : 'bg-gray-100 text-gray-800'}`}>
                <p className="text-sm whitespace-pre-wrap">{m.corps}</p>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 px-0.5">
                <span className={m.auteur_role === 'admin' ? 'font-semibold text-sky-700' : 'font-medium text-gray-500'}>{m.auteur_nom}</span>
                {' · '}{fmtLong(m.created_at)}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t px-5 py-3 flex-shrink-0">
          <form onSubmit={handleReply} className="flex gap-2">
            <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Répondre…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
            <button type="submit" disabled={sending || !reply.trim()} aria-label="Envoyer"
              className="px-3 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: '#3D5AFE' }}>
              <Send className="h-4 w-4" />
            </button>
          </form>
          {ticket && (
            <button onClick={toggleStatut} disabled={toggling}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 disabled:opacity-50">
              {ticket.statut === 'ouvert'
                ? <><CheckCircle2 className="h-3.5 w-3.5" /> Marquer comme résolu</>
                : <><RotateCcw className="h-3.5 w-3.5" /> Rouvrir</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Tickets() {
  const [tickets, setTickets] = useState(null);
  const [clients, setClients] = useState([]);
  const [statutFiltre, setStatutFiltre] = useState('ouvert');
  const [clientFiltre, setClientFiltre] = useState('');
  const [nouveauModal, setNouveauModal] = useState(false);
  const [ticketOuvertId, setTicketOuvertId] = useState(null);

  useEffect(() => { api.getClients().then(setClients).catch(() => {}); }, []);

  const load = useCallback(() => {
    const params = {};
    if (statutFiltre) params.statut = statutFiltre;
    if (clientFiltre) params.client_id = clientFiltre;
    api.getTickets(params).then(setTickets).catch(() => {});
  }, [statutFiltre, clientFiltre]);

  useEffect(() => { load(); }, [load]);

  async function handleCreated(clientId, message) {
    await api.createTicket(clientId, message);
    load();
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Tickets</h1>
          <p className="text-xs text-gray-400 mt-0.5">{tickets ? `${tickets.length} ticket(s)` : '…'}</p>
        </div>
        <button onClick={() => setNouveauModal(true)}
          className="flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium"
          style={{ backgroundColor: '#3D5AFE' }}>
          <Plus className="h-4 w-4" /> Nouveau ticket
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
          {[['ouvert', 'Ouverts'], ['resolu', 'Résolus'], ['', 'Tous']].map(([val, label]) => (
            <button key={val} onClick={() => setStatutFiltre(val)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statutFiltre === val ? 'bg-sky-50 text-sky-700' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <select value={clientFiltre} onChange={e => setClientFiltre(e.target.value)}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300">
          <option value="">Toutes les salles</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {tickets === null ? (
        <div className="text-center py-10 text-gray-400 text-sm">Chargement…</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm italic">Aucun ticket pour cette sélection.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {tickets.map(t => {
            const statutCfg = STATUT_TICKET[t.statut] || STATUT_TICKET.ouvert;
            return (
              <button key={t.id} onClick={() => setTicketOuvertId(t.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-sky-700 flex-shrink-0">{t.client_nom}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${statutCfg.bg} ${statutCfg.text}`}>
                      {statutCfg.label}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-800 truncate mt-0.5">{t.sujet}</div>
                  {t.dernier_message && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {t.dernier_auteur_role === 'admin' ? 'Toi : ' : ''}{t.dernier_message}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 flex-shrink-0">{fmtCourt(t.updated_at)}</div>
              </button>
            );
          })}
        </div>
      )}

      {nouveauModal && (
        <NouveauTicketModal clients={clients} onCreated={handleCreated} onClose={() => setNouveauModal(false)} />
      )}
      {ticketOuvertId != null && (
        <ConversationModal ticketId={ticketOuvertId} onClose={() => setTicketOuvertId(null)} onChanged={load} />
      )}
    </AdminLayout>
  );
}
