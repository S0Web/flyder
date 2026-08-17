import { useState, useEffect, useCallback } from 'react';
import { LifeBuoy, X, Send, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useDismiss } from '../lib/useDismiss';
import { useToast } from '../context/ToastContext';
import { parseServerDate } from '../lib/utils';

const STATUT_TICKET = {
  ouvert: { label: 'Ouvert', bg: 'bg-amber-100', text: 'text-amber-700' },
  resolu: { label: 'Résolu', bg: 'bg-green-100', text: 'text-green-700' },
};

function fmtCourt(iso) {
  return parseServerDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function fmtLong(iso) {
  return parseServerDate(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Nouveau ticket ───────────────────────────────────────────────────────────
// Contenu volontairement minimal — un seul champ, comme la capture d'écran de
// référence (pas de "sujet" séparé, dérivé côté serveur du début du message).
function NouveauTicketModal({ onCreated, onClose }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const { closing, dismiss } = useDismiss(onClose);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await onCreated(message.trim());
      setEnvoye(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [dismiss]);

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 ${closing ? 'animate-overlayOut' : 'animate-overlayIn'}`}
      onClick={dismiss}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-md ${closing ? 'animate-modalOut' : 'animate-modalIn'}`}
        onClick={e => e.stopPropagation()}
      >
        {envoye ? (
          <div className="px-6 py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-gray-800 mb-1">Message envoyé</h2>
            <p className="text-sm text-gray-500">L'équipe Flyder te répond ici, généralement sous 24h.</p>
            <button onClick={dismiss}
              className="mt-5 text-sm px-4 py-2 rounded text-white font-medium"
              style={{ backgroundColor: '#3D5AFE' }}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5 pb-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Contacter le support</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
              <textarea
                autoFocus rows={5} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Décris ton problème…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
              />
              <p className="text-xs text-gray-400">Ton message sera transmis à l'équipe Flyder, qui te répondra directement ici.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={dismiss}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-transform">
                  Annuler
                </button>
                <button type="submit" disabled={saving || !message.trim()}
                  className="flex-1 bg-sky-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50 active:scale-[0.98] transition-transform">
                  {saving ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Conversation ─────────────────────────────────────────────────────────────
// Deux colonnes façon support client (Flyder à gauche, la salle à droite) —
// même si plusieurs profils différents répondent côté salle, le nom de
// l'auteur reste affiché sous chaque message.
function ConversationModal({ ticketId, onClose, onChanged }) {
  const toast = useToast();
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [togglingStatut, setTogglingStatut] = useState(false);
  const { closing, dismiss } = useDismiss(onClose);

  const load = useCallback(() => {
    api.getTicket(ticketId)
      .then(t => { setTicket(t); onChanged(); })
      .catch(err => { toast.error(err.message); dismiss(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [dismiss]);

  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const updated = await api.replyTicket(ticketId, reply.trim());
      setTicket(updated);
      setReply('');
    } catch (err) {
      toast.error('Échec : ' + err.message);
    } finally {
      setSending(false);
    }
  }

  async function toggleStatut() {
    const nouveauStatut = ticket.statut === 'ouvert' ? 'resolu' : 'ouvert';
    setTogglingStatut(true);
    try {
      await api.setTicketStatut(ticketId, nouveauStatut);
      setTicket(t => ({ ...t, statut: nouveauStatut }));
      onChanged();
    } catch (err) {
      toast.error('Échec : ' + err.message);
    } finally {
      setTogglingStatut(false);
    }
  }

  const statutCfg = ticket ? STATUT_TICKET[ticket.statut] : null;

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 ${closing ? 'animate-overlayOut' : 'animate-overlayIn'}`}
      onClick={dismiss}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col ${closing ? 'animate-modalOut' : 'animate-modalIn'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 border-b flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-800 truncate">{ticket?.sujet || 'Conversation'}</h2>
            {statutCfg && (
              <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${statutCfg.bg} ${statutCfg.text}`}>
                {statutCfg.label}
              </span>
            )}
          </div>
          <button onClick={dismiss} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!ticket && <p className="text-sm text-gray-400 text-center py-6">Chargement…</p>}
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
            <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Écrire une réponse…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
            <button type="submit" disabled={sending || !reply.trim()}
              aria-label="Envoyer"
              className="px-3 py-2 rounded-lg text-white disabled:opacity-50 active:scale-90 transition-transform"
              style={{ backgroundColor: '#3D5AFE' }}>
              <Send className="h-4 w-4" />
            </button>
          </form>
          {ticket && (
            <button onClick={toggleStatut} disabled={togglingStatut}
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

// ── Liste ────────────────────────────────────────────────────────────────────
function TicketListe({ tickets, onOpen }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
      {tickets.map(t => (
        <button key={t.id} onClick={() => onOpen(t.id)}
          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3">
          {t.non_lu_salle === 1 && (
            <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 animate-pop" aria-label="Nouvelle réponse" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-800 truncate">{t.sujet}</div>
            {t.dernier_message && <div className="text-xs text-gray-400 truncate mt-0.5">{t.dernier_message}</div>}
          </div>
          <div className="text-[11px] text-gray-400 flex-shrink-0">{fmtCourt(t.updated_at)}</div>
        </button>
      ))}
    </div>
  );
}

// ── Onglet ───────────────────────────────────────────────────────────────────
export default function TicketsTab({ onRead }) {
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState(null);
  const [ouvrirNouveau, setOuvrirNouveau] = useState(false);
  const [ticketOuvertId, setTicketOuvertId] = useState(null);

  const load = useCallback(() => {
    setError(null);
    api.getTickets().then(setTickets).catch(err => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreated(message) {
    await api.createTicket(message);
    load();
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
        <p className="text-sm text-amber-800">{error}</p>
      </div>
    );
  }

  const ouverts = tickets?.filter(t => t.statut === 'ouvert') || [];
  const resolus = tickets?.filter(t => t.statut === 'resolu') || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">Une question, un problème ? On te répond ici.</p>
        <button onClick={() => setOuvrirNouveau(true)}
          className="flex items-center gap-1.5 text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: '#3D5AFE' }}>
          <LifeBuoy className="h-4 w-4" /> Contacter le support
        </button>
      </div>

      {tickets === null && <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>}
      {tickets?.length === 0 && (
        <p className="text-sm text-gray-400 italic text-center py-8">Aucun ticket pour l'instant.</p>
      )}

      {ouverts.length > 0 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">En cours</div>
          <TicketListe tickets={ouverts} onOpen={setTicketOuvertId} />
        </div>
      )}
      {resolus.length > 0 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5 mt-4">Résolus</div>
          <TicketListe tickets={resolus} onOpen={setTicketOuvertId} />
        </div>
      )}

      {ouvrirNouveau && (
        <NouveauTicketModal onCreated={handleCreated} onClose={() => setOuvrirNouveau(false)} />
      )}
      {ticketOuvertId != null && (
        <ConversationModal
          ticketId={ticketOuvertId}
          onClose={() => setTicketOuvertId(null)}
          onChanged={() => { load(); onRead?.(); }}
        />
      )}
    </div>
  );
}
