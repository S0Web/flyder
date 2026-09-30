const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { dateLocaleISO, ajouterJours, ajouterMois } = require('../lib/dates');
const { genererChecklists } = require('../lib/checklists');

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
  return estManager(req) || tache.assigne_a === req.user.id;
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
  db.run('UPDATE taches SET occurrence_suivante_id = ? WHERE id = ?', [result.lastInsertRowid, tache.id]);
}

// GET /api/taches?assigne_a=&vue=ouvertes|faites|toutes
router.get('/', (req, res) => {
  genererChecklists(); // checklists du jour pour la personne planifiée (idempotent)
  const where = [];
  const params = [];
  if (!estManager(req)) {
    where.push('t.assigne_a = ?'); params.push(req.user.id);
  } else if (req.query.assigne_a) {
    where.push('t.assigne_a = ?'); params.push(Number(req.query.assigne_a));
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
  res.json(rows);
});

// POST /api/taches
router.post('/', (req, res) => {
  const { titre, description, assigne_a, echeance, priorite, recurrence } = req.body;
  if (!titre || !titre.trim()) return res.status(400).json({ error: 'Le titre est requis' });
  const cible = estManager(req) && assigne_a ? Number(assigne_a) : req.user.id;
  if (!db.get('SELECT 1 FROM app_users WHERE id = ? AND supprime = 0', [cible])) {
    return res.status(400).json({ error: 'Membre introuvable' });
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
  res.status(201).json(db.get(`${SELECT_TACHE} WHERE t.id = ?`, [result.lastInsertRowid]));
});

// PATCH /api/taches/:id — statut (assigné ou manager) ; contenu (auteur ou manager).
router.patch('/:id', (req, res) => {
  const tache = db.get('SELECT * FROM taches WHERE id = ?', [req.params.id]);
  if (!tache || !peutVoir(req, tache)) return res.status(404).json({ error: 'Tâche introuvable' });

  const peutEditer = estManager(req) || tache.cree_par === req.user.id;
  const b = req.body;
  const champsContenu = ['titre', 'description', 'echeance', 'priorite', 'recurrence', 'assigne_a'];
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
  if (next.statut === 'fait' && tache.statut !== 'fait') creerOccurrenceSuivante(next);
  res.json(db.get(`${SELECT_TACHE} WHERE t.id = ?`, [tache.id]));
});

// DELETE /api/taches/:id — auteur ou manager.
router.delete('/:id', (req, res) => {
  const tache = db.get('SELECT * FROM taches WHERE id = ?', [req.params.id]);
  if (!tache || !peutVoir(req, tache)) return res.status(404).json({ error: 'Tâche introuvable' });
  if (!estManager(req) && tache.cree_par !== req.user.id) {
    return res.status(403).json({ error: "Seul l'auteur de la tâche ou un manager peut la supprimer." });
  }
  db.run('DELETE FROM taches WHERE id = ?', [tache.id]);
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
