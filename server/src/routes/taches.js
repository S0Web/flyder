const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { dateLocaleISO, ajouterJours, ajouterMois } = require('../lib/dates');
const { genererChecklists } = require('../lib/checklists');
const { logAudit } = require('../lib/audit');

const STATUT_LABELS = { a_faire: 'à faire', en_cours: 'en cours', fait: 'fait' };
function nomDe(userId) {
  const u = db.get('SELECT prenom, nom FROM app_users WHERE id = ?', [userId]);
  return u ? `${u.prenom} ${u.nom || ''}`.trim() : `#${userId}`;
}

// ─── Co-assignation ───────────────────────────────────────────────────────────
// assigne_a reste le responsable principal (checklists, occurrence suivante…) ;
// tache_coassignes ajoute d'autres personnes sur la même tâche.

function coAssignesDe(tacheId) {
  return db.all(
    `SELECT u.id, u.prenom, u.nom FROM tache_coassignes tc
     JOIN app_users u ON u.id = tc.user_id WHERE tc.tache_id = ? ORDER BY u.prenom`,
    [tacheId]
  );
}

// Annote un lot de tâches avec leur liste de co-assignés en une seule requête
// (évite un aller-retour base par tâche).
function annoterCoAssignes(taches) {
  if (!taches.length) return taches;
  const ids = taches.map(t => t.id);
  const liens = db.all(
    `SELECT tc.tache_id, u.id, u.prenom, u.nom FROM tache_coassignes tc
     JOIN app_users u ON u.id = tc.user_id
     WHERE tc.tache_id IN (${ids.map(() => '?').join(',')}) ORDER BY u.prenom`,
    ids
  );
  const parTache = new Map();
  for (const l of liens) {
    if (!parTache.has(l.tache_id)) parTache.set(l.tache_id, []);
    parTache.get(l.tache_id).push({ id: l.id, prenom: l.prenom, nom: l.nom });
  }
  taches.forEach(t => { t.co_assignes = parTache.get(t.id) || []; });
  return taches;
}

// Remplace l'ensemble des co-assignés d'une tâche. `ids` : liste d'identifiants,
// déjà filtrée de l'assigné principal et des doublons.
function definirCoAssignes(tacheId, ids) {
  db.run('DELETE FROM tache_coassignes WHERE tache_id = ?', [tacheId]);
  for (const id of ids) {
    db.run('INSERT OR IGNORE INTO tache_coassignes (tache_id, user_id) VALUES (?, ?)', [tacheId, id]);
  }
}

// Valide et nettoie une liste de co-assignés envoyée par le client : entiers,
// membres existants et actifs, sans doublon ni l'assigné principal.
function nettoyerCoAssignes(liste, principal) {
  const ids = [...new Set((Array.isArray(liste) ? liste : []).map(Number).filter(n => Number.isInteger(n)))]
    .filter(id => id !== principal);
  for (const id of ids) {
    if (!db.get('SELECT 1 FROM app_users WHERE id = ? AND supprime = 0', [id])) {
      throw new Error('Un des membres co-assignés est introuvable.');
    }
  }
  return ids;
}

// Tâches de l'équipe. Le manager voit et gère tout ; un salarié ne voit que les
// tâches qui lui sont assignées, peut s'en créer lui-même (la tâche garde son
// auteur, affiché « créée par… »), faire avancer leur statut, et ne modifie ou
// supprime que celles qu'il a créées.

const PRIORITES  = ['basse', 'normale', 'haute', 'urgente'];
const STATUTS    = ['a_faire', 'en_cours', 'fait'];
const RECURRENCES = ['aucune', 'quotidienne', 'hebdomadaire', 'mensuelle'];

const SELECT_TACHE = `
  SELECT t.*,
    a.prenom AS assigne_prenom, a.nom AS assigne_nom,
    c.prenom AS cree_par_prenom, c.nom AS cree_par_nom, c.role AS cree_par_role,
    (SELECT COUNT(*) FROM tache_commentaires tc WHERE tc.tache_id = t.id) AS nb_commentaires
  FROM taches t
  JOIN app_users a ON a.id = t.assigne_a
  JOIN app_users c ON c.id = t.cree_par
`;

const estManager = (req) => req.user.role === 'manager';

function peutVoir(req, tache) {
  if (estManager(req) || tache.assigne_a === req.user.id) return true;
  return !!db.get('SELECT 1 FROM tache_coassignes WHERE tache_id = ? AND user_id = ?', [tache.id, req.user.id]);
}

// Échéance de l'occurrence suivante : on avance d'un pas depuis l'échéance
// actuelle, puis on rattrape si elle est déjà passée (tâche bouclée en retard).
// Une tâche quotidienne terminée vaut pour aujourd'hui : la suivante est demain.
function prochaineEcheance(tache) {
  const aujourdhui = dateLocaleISO();
  const pas = (x) => tache.recurrence === 'quotidienne' ? ajouterJours(x, 1)
    : tache.recurrence === 'hebdomadaire' ? ajouterJours(x, 7)
    : ajouterMois(x, 1);
  const enRetard = (x) => tache.recurrence === 'quotidienne' ? x <= aujourdhui : x < aujourdhui;
  let d = pas(tache.echeance || aujourdhui);
  while (enRetard(d)) d = pas(d);
  return d;
}

// Crée l'occurrence suivante d'une tâche récurrente qui vient d'être terminée
// (une seule fois par tâche, même si on la décoche puis la recoche).
function creerOccurrenceSuivante(tache) {
  if (tache.recurrence === 'aucune' || tache.occurrence_suivante_id) return;
  const result = db.run(
    `INSERT INTO taches (titre, description, assigne_a, cree_par, echeance, priorite, recurrence)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tache.titre, tache.description, tache.assigne_a, tache.cree_par, prochaineEcheance(tache), tache.priorite, tache.recurrence]
  );
  const co = coAssignesDe(tache.id).map(u => u.id);
  if (co.length) definirCoAssignes(result.lastInsertRowid, co);
  db.run('UPDATE taches SET occurrence_suivante_id = ? WHERE id = ?', [result.lastInsertRowid, tache.id]);
}

// GET /api/taches?assigne_a=&vue=ouvertes|faites|toutes
router.get('/', (req, res) => {
  genererChecklists(); // checklists du jour pour la personne planifiée (idempotent)
  const where = [];
  const params = [];
  // Co-assigné : une tâche compte pour cette personne même si elle n'est pas
  // l'assignée principale (t.assigne_a).
  const appartientA = (id) => { where.push('(t.assigne_a = ? OR t.id IN (SELECT tache_id FROM tache_coassignes WHERE user_id = ?))'); params.push(id, id); };
  if (!estManager(req)) {
    appartientA(req.user.id);
  } else if (req.query.assigne_a) {
    appartientA(Number(req.query.assigne_a));
  }
  const vue = req.query.vue || 'toutes';
  if (vue === 'ouvertes') where.push("t.statut != 'fait'");
  // Les tâches terminées s'accumulent vite : on ne renvoie que les 60 derniers jours.
  if (vue === 'faites') where.push("t.statut = 'fait' AND t.fait_le >= datetime('now', '-60 days')");
  if (vue === 'toutes') where.push("(t.statut != 'fait' OR t.fait_le >= datetime('now', '-60 days'))");

  const rows = db.all(
    `${SELECT_TACHE} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY (t.echeance IS NULL), t.echeance,
       CASE t.priorite WHEN 'urgente' THEN 0 WHEN 'haute' THEN 1 WHEN 'normale' THEN 2 ELSE 3 END,
       t.created_at`,
    params
  );
  res.json(annoterCoAssignes(rows));
});

// POST /api/taches
router.post('/', (req, res) => {
  const { titre, description, assigne_a, echeance, priorite, recurrence, co_assignes } = req.body;
  if (!titre || !titre.trim()) return res.status(400).json({ error: 'Le titre est requis' });
  const cible = estManager(req) && assigne_a ? Number(assigne_a) : req.user.id;
  if (!db.get('SELECT 1 FROM app_users WHERE id = ? AND supprime = 0', [cible])) {
    return res.status(400).json({ error: 'Membre introuvable' });
  }
  let co;
  try {
    co = estManager(req) ? nettoyerCoAssignes(co_assignes, cible) : [];
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const result = db.run(
    `INSERT INTO taches (titre, description, assigne_a, cree_par, echeance, priorite, recurrence)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      titre.trim(), (description || '').trim(), cible, req.user.id, echeance || null,
      PRIORITES.includes(priorite) ? priorite : 'normale',
      RECURRENCES.includes(recurrence) ? recurrence : 'aucune',
    ]
  );
  if (co.length) definirCoAssignes(result.lastInsertRowid, co);
  const qui = [nomDe(cible), ...co.map(nomDe)].join(', ');
  logAudit({ userId: req.user.id, action: 'creer_tache', entity: 'taches', entityId: result.lastInsertRowid,
    details: `${qui} — tâche créée : ${titre.trim()}` });
  res.status(201).json(annoterCoAssignes([db.get(`${SELECT_TACHE} WHERE t.id = ?`, [result.lastInsertRowid])])[0]);
});

// PATCH /api/taches/:id — statut (assigné ou manager) ; contenu (auteur ou manager).
router.patch('/:id', (req, res) => {
  const tache = db.get('SELECT * FROM taches WHERE id = ?', [req.params.id]);
  if (!tache || !peutVoir(req, tache)) return res.status(404).json({ error: 'Tâche introuvable' });

  const peutEditer = estManager(req) || tache.cree_par === req.user.id;
  const b = req.body;
  const champsContenu = ['titre', 'description', 'echeance', 'priorite', 'recurrence', 'assigne_a', 'co_assignes'];
  if (!peutEditer && champsContenu.some(k => b[k] !== undefined)) {
    return res.status(403).json({ error: "Seul l'auteur de la tâche ou un manager peut la modifier." });
  }

  const next = { ...tache };
  if (b.titre !== undefined) {
    if (!String(b.titre).trim()) return res.status(400).json({ error: 'Le titre est requis' });
    next.titre = String(b.titre).trim();
  }
  if (b.description !== undefined) next.description = String(b.description).trim();
  if (b.echeance !== undefined) next.echeance = b.echeance || null;
  if (b.priorite !== undefined && PRIORITES.includes(b.priorite)) next.priorite = b.priorite;
  if (b.recurrence !== undefined && RECURRENCES.includes(b.recurrence)) next.recurrence = b.recurrence;
  if (b.assigne_a !== undefined && estManager(req)) next.assigne_a = Number(b.assigne_a);

  let co = null; // null = inchangé
  if (estManager(req) && (b.co_assignes !== undefined || b.assigne_a !== undefined)) {
    try {
      // assigne_a peut changer dans le même appel : on nettoie co_assignes (envoyé,
      // ou les co-assignés actuels si seul assigne_a a bougé) contre le nouveau principal.
      const source = b.co_assignes !== undefined ? b.co_assignes : coAssignesDe(tache.id).map(u => u.id);
      co = nettoyerCoAssignes(source, next.assigne_a);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  if (b.statut !== undefined && STATUTS.includes(b.statut) && b.statut !== tache.statut) {
    next.statut = b.statut;
    if (b.statut === 'fait') {
      next.fait_le = new Date().toISOString().replace('T', ' ').slice(0, 19);
      next.fait_par = req.user.id;
    } else {
      next.fait_le = null;
      next.fait_par = null;
    }
  }

  db.run(
    `UPDATE taches SET titre=?, description=?, echeance=?, priorite=?, recurrence=?, assigne_a=?,
       statut=?, fait_le=?, fait_par=?, updated_at=datetime('now') WHERE id=?`,
    [next.titre, next.description, next.echeance, next.priorite, next.recurrence, next.assigne_a,
     next.statut, next.fait_le, next.fait_par, tache.id]
  );
  if (co !== null) definirCoAssignes(tache.id, co);
  if (next.statut === 'fait' && tache.statut !== 'fait') creerOccurrenceSuivante(next);

  const statutChange = next.statut !== tache.statut;
  const contenuChange = champsContenu.some((k) => b[k] !== undefined);
  const resume = statutChange && !contenuChange
    ? `${STATUT_LABELS[tache.statut]} → ${STATUT_LABELS[next.statut]}`
    : statutChange
      ? `modifiée, ${STATUT_LABELS[tache.statut]} → ${STATUT_LABELS[next.statut]}`
      : 'modifiée';
  const qui = co !== null ? [nomDe(next.assigne_a), ...co.map(nomDe)].join(', ') : nomDe(next.assigne_a);
  logAudit({ userId: req.user.id, action: 'modifier_tache', entity: 'taches', entityId: tache.id,
    details: `${qui} — ${next.titre} : ${resume}` });

  res.json(annoterCoAssignes([db.get(`${SELECT_TACHE} WHERE t.id = ?`, [tache.id])])[0]);
});

// DELETE /api/taches/:id — auteur ou manager.
router.delete('/:id', (req, res) => {
  const tache = db.get('SELECT * FROM taches WHERE id = ?', [req.params.id]);
  if (!tache || !peutVoir(req, tache)) return res.status(404).json({ error: 'Tâche introuvable' });
  if (!estManager(req) && tache.cree_par !== req.user.id) {
    return res.status(403).json({ error: "Seul l'auteur de la tâche ou un manager peut la supprimer." });
  }
  db.run('DELETE FROM taches WHERE id = ?', [tache.id]);
  logAudit({ userId: req.user.id, action: 'supprimer_tache', entity: 'taches', entityId: tache.id,
    details: `${nomDe(tache.assigne_a)} — tâche supprimée : ${tache.titre}` });
  res.json({ ok: true });
});

// ─── Commentaires ─────────────────────────────────────────────────────────────

router.get('/:id/commentaires', (req, res) => {
  const tache = db.get('SELECT * FROM taches WHERE id = ?', [req.params.id]);
  if (!tache || !peutVoir(req, tache)) return res.status(404).json({ error: 'Tâche introuvable' });
  res.json(db.all(
    `SELECT tc.*, u.prenom, u.nom FROM tache_commentaires tc
     JOIN app_users u ON u.id = tc.auteur_id
     WHERE tc.tache_id = ? ORDER BY tc.created_at`,
    [tache.id]
  ));
});

router.post('/:id/commentaires', (req, res) => {
  const tache = db.get('SELECT * FROM taches WHERE id = ?', [req.params.id]);
  if (!tache || !peutVoir(req, tache)) return res.status(404).json({ error: 'Tâche introuvable' });
  const contenu = String(req.body.contenu || '').trim();
  if (!contenu) return res.status(400).json({ error: 'Commentaire vide' });
  const result = db.run('INSERT INTO tache_commentaires (tache_id, auteur_id, contenu) VALUES (?, ?, ?)',
    [tache.id, req.user.id, contenu]);
  res.status(201).json(db.get(
    `SELECT tc.*, u.prenom, u.nom FROM tache_commentaires tc JOIN app_users u ON u.id = tc.auteur_id WHERE tc.id = ?`,
    [result.lastInsertRowid]
  ));
});

module.exports = router;
