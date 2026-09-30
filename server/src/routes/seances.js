const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { alertesComplet } = require('../lib/remplissage');
const { horaireEnMinutes } = require('../lib/dates');

const SEANCE_SELECT = `
  SELECT
    s.id, s.date, s.horaire, s.duree_minutes, s.statut, s.nb_presents, s.notes,
    s.cours_type_id, ct.nom AS cours_nom, ct.categorie, ct.capacite,
    s.coach_id, c.prenom AS coach_prenom, c.nom AS coach_nom,
    s.pointeur_user_id,
    TRIM(pu.prenom || ' ' || pu.nom) AS pointeur_nom
  FROM seances s
  JOIN cours_types ct   ON ct.id = s.cours_type_id
  LEFT JOIN coaches c   ON c.id  = s.coach_id
  LEFT JOIN app_users pu ON pu.id = s.pointeur_user_id
`;

// Calcule lundi et dimanche d'une semaine à partir d'une date ISO string (sans timezone bug)
function getSemaineBounds(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  // Crée la date en heure locale pour éviter le décalage UTC
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0=dim, 1=lun...
  const diffLundi = day === 0 ? -6 : 1 - day;
  const lundi = new Date(y, m - 1, d + diffLundi);
  const dimanche = new Date(y, m - 1, d + diffLundi + 6);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  return { lundi: fmt(lundi), dimanche: fmt(dimanche) };
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// GET /api/seances?semaine=YYYY-MM-DD  (n'importe quel jour de la semaine)
router.get('/', (req, res) => {
  const { semaine, date } = req.query;

  if (date) {
    const rows = db.all(`${SEANCE_SELECT} WHERE s.date = ? ORDER BY CAST(SUBSTR(s.horaire, 1, INSTR(s.horaire||'h', 'h')-1) AS INTEGER) * 60
         + CAST(CASE WHEN INSTR(s.horaire,'h') > 0 AND LENGTH(s.horaire) > INSTR(s.horaire,'h')
                     THEN SUBSTR(s.horaire, INSTR(s.horaire,'h')+1) ELSE '0' END AS INTEGER)`, [date]);
    return res.json(rows);
  }

  const { lundi, dimanche } = getSemaineBounds(semaine || todayISO());
  const rows = db.all(
    `${SEANCE_SELECT} WHERE s.date BETWEEN ? AND ? ORDER BY s.date,
         CAST(SUBSTR(s.horaire, 1, INSTR(s.horaire||'h', 'h')-1) AS INTEGER) * 60
         + CAST(CASE WHEN INSTR(s.horaire,'h') > 0 AND LENGTH(s.horaire) > INSTR(s.horaire,'h')
                     THEN SUBSTR(s.horaire, INSTR(s.horaire,'h')+1) ELSE '0' END AS INTEGER)`,
    [lundi, dimanche]
  );
  res.json(rows);
});

// GET /api/seances/alertes-remplissage — créneaux complets plusieurs fois de suite
router.get('/alertes-remplissage', (req, res) => {
  res.json(alertesComplet());
});

// GET /api/seances/:id
router.get('/:id', (req, res) => {
  const row = db.get(`${SEANCE_SELECT} WHERE s.id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Séance introuvable' });
  res.json(row);
});

// POST /api/seances/dupliquer — copie la semaine source vers la semaine cible
router.post('/dupliquer', (req, res) => {
  const { semaine_source, semaine_cible } = req.body;
  if (!semaine_source || !semaine_cible) {
    return res.status(400).json({ error: 'semaine_source et semaine_cible requis' });
  }

  const { lundi: ls, dimanche: ds } = getSemaineBounds(semaine_source);
  const { lundi: lc } = getSemaineBounds(semaine_cible);

  const sources = db.all(
    'SELECT * FROM seances WHERE date BETWEEN ? AND ?',
    [ls, ds]
  );

  if (sources.length === 0) {
    return res.status(404).json({ error: 'Aucune séance dans la semaine source' });
  }

  // Calcul du décalage en jours entre les deux lundis
  const diffMs = new Date(lc + 'T00:00:00') - new Date(ls + 'T00:00:00');
  const diffDays = Math.round(diffMs / 86400000);

  const pad = (n) => String(n).padStart(2, '0');
  db.run('BEGIN');
  let count = 0, ignores = 0;
  try {
    for (const s of sources) {
      const srcDate = new Date(s.date + 'T00:00:00');
      srcDate.setDate(srcDate.getDate() + diffDays);
      const newDate = `${srcDate.getFullYear()}-${pad(srcDate.getMonth() + 1)}-${pad(srcDate.getDate())}`;
      // Non destructif : on ne recrée pas un cours identique (même jour, même
      // horaire, même type) s'il existe déjà dans la semaine cible.
      const existing = db.get(
        'SELECT id FROM seances WHERE date = ? AND horaire = ? AND cours_type_id = ?',
        [newDate, s.horaire, s.cours_type_id]
      );
      if (existing) { ignores++; continue; }
      db.run(
        `INSERT INTO seances (date, cours_type_id, coach_id, horaire, duree_minutes, statut, nb_presents, pointeur_id, notes)
         VALUES (?, ?, ?, ?, ?, 'programme', NULL, NULL, NULL)`,
        [newDate, s.cours_type_id, s.coach_id || null, s.horaire, s.duree_minutes || 60]
      );
      count++;
    }
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    return res.status(500).json({ error: e.message });
  }

  res.json({ ok: true, count, ignores });
});

// POST /api/seances
router.post('/', (req, res) => {
  const { date, cours_type_id, coach_id, horaire, duree_minutes, notes } = req.body;
  if (!date || !cours_type_id || !horaire) {
    return res.status(400).json({ error: 'date, cours_type_id, horaire requis' });
  }
  const result = db.run(
    `INSERT INTO seances (date, cours_type_id, coach_id, horaire, duree_minutes, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [date, cours_type_id, coach_id || null, horaire, duree_minutes || 60, notes || null]
  );
  res.status(201).json(db.get(`${SEANCE_SELECT} WHERE s.id = ?`, [result.lastInsertRowid]));
});

// PATCH /api/seances/:id — mise à jour partielle
router.patch('/:id', (req, res) => {
  try {
    const existing = db.get('SELECT id, pointeur_user_id, coach_id FROM seances WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Séance introuvable' });

    const body = { ...req.body };
    // Renseigner l'effectif passe automatiquement le statut à "Effectué",
    // sauf si l'appelant envoie explicitement un statut (ex: le formulaire complet).
    if (body.nb_presents !== undefined && body.statut === undefined) {
      body.statut = 'effectue';
    }
    // Par défaut, la personne qui renseigne l'effectif est celle dont la session est
    // ouverte — sauf si un pointeur est déjà identifié, ou explicitement fourni ici.
    if (body.nb_presents !== undefined && body.pointeur_user_id === undefined
        && !existing.pointeur_user_id && req.user) {
      body.pointeur_user_id = req.user.id;
    }

    const allowed = ['statut', 'nb_presents', 'pointeur_user_id', 'notes', 'coach_id',
                     'cours_type_id', 'horaire', 'duree_minutes', 'date'];
    const updates = [];
    const values  = [];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`);
        // coach_id et pointeur_user_id : 0 ou '' deviennent NULL
        const nullables = ['coach_id', 'pointeur_user_id', 'nb_presents'];
        const v = body[key];
        values.push(nullables.includes(key) && (v === '' || v === 0) ? null : v);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier' });

    values.push(req.params.id);
    db.run(`UPDATE seances SET ${updates.join(', ')} WHERE id = ?`, values);

    // Un coach remplacé par un autre depuis le formulaire laisse la même trace qu'un remplacement
    // explicite (sans motif). Attribuer un coach à une séance qui n'en avait pas n'en est pas un.
    const nouveauCoach = body.coach_id === '' || body.coach_id === 0 ? null : body.coach_id;
    if (body.coach_id !== undefined && existing.coach_id && nouveauCoach && Number(nouveauCoach) !== existing.coach_id) {
      db.run(
        `INSERT INTO modifications_ponctuelles (seance_id, type, ancien_coach_id, nouveau_coach_id, raison, auteur_id)
         VALUES (?, 'remplacement_coach', ?, ?, NULL, ?)`,
        [existing.id, existing.coach_id, Number(nouveauCoach), req.user?.id ?? null]
      );
    }

    if (req.user) {
      const detail = allowed.filter(k => body[k] !== undefined).map(k => `${k}=${body[k]}`).join(', ');
      db.run('INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'update_seance', 'seances', req.params.id, detail]);
    }

    res.json(db.get(`${SEANCE_SELECT} WHERE s.id = ?`, [req.params.id]));
  } catch (e) {
    console.error('PATCH seance error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Remplacement de coach ─────────────────────────────────────────────────────

const SELECT_MODIF = `
  SELECT mp.id, mp.type, mp.raison, mp.date_modification,
    mp.ancien_coach_id, TRIM(ca.prenom || ' ' || ca.nom) AS ancien_coach,
    mp.nouveau_coach_id, TRIM(cn.prenom || ' ' || cn.nom) AS nouveau_coach,
    TRIM(u.prenom || ' ' || u.nom) AS auteur
  FROM modifications_ponctuelles mp
  LEFT JOIN coaches ca ON ca.id = mp.ancien_coach_id
  LEFT JOIN coaches cn ON cn.id = mp.nouveau_coach_id
  LEFT JOIN app_users u ON u.id = mp.auteur_id
`;

const formatHeure = (mins) => `${Math.floor(mins / 60)}h${mins % 60 ? String(mins % 60).padStart(2, '0') : ''}`;

// Autre séance (non annulée) du même jour dont l'horaire chevauche celle-ci, pour ce coach.
function coursEnConflit(seance, coachId) {
  const debut = horaireEnMinutes(seance.horaire);
  if (debut === null) return null;
  const fin = debut + (seance.duree_minutes || 60);
  const autres = db.all(
    `SELECT id, horaire, duree_minutes FROM seances WHERE date = ? AND coach_id = ? AND id != ? AND statut != 'annule'`,
    [seance.date, coachId, seance.id]
  );
  for (const a of autres) {
    const d = horaireEnMinutes(a.horaire);
    if (d !== null && d < fin && debut < d + (a.duree_minutes || 60)) return formatHeure(d);
  }
  return null;
}

// GET /api/seances/:id/remplacement — coachs proposés pour remplacer + historique des remplacements.
// Les coachs déjà pris sur ce créneau sont signalés, ceux qui ont déjà donné ce cours remontent en tête.
router.get('/:id/remplacement', (req, res) => {
  const seance = db.get('SELECT * FROM seances WHERE id = ?', [req.params.id]);
  if (!seance) return res.status(404).json({ error: 'Séance introuvable' });
  const dejaDonne = new Map(db.all(
    `SELECT coach_id, COUNT(*) AS n FROM seances
     WHERE cours_type_id = ? AND coach_id IS NOT NULL AND statut IN ('effectue','paye') GROUP BY coach_id`,
    [seance.cours_type_id]
  ).map(r => [r.coach_id, r.n]));

  const candidats = db.all('SELECT id, prenom, nom FROM coaches WHERE actif = 1 AND supprime = 0')
    .filter(c => c.id !== seance.coach_id)
    .map(c => ({ ...c, occupe_a: coursEnConflit(seance, c.id), deja_donne: dejaDonne.get(c.id) || 0 }))
    .sort((a, b) => (a.occupe_a ? 1 : 0) - (b.occupe_a ? 1 : 0) || b.deja_donne - a.deja_donne
      || a.prenom.localeCompare(b.prenom, 'fr'));

  const historique = db.all(`${SELECT_MODIF} WHERE mp.seance_id = ? ORDER BY mp.date_modification DESC, mp.id DESC`, [seance.id]);
  res.json({ candidats, historique });
});

// POST /api/seances/:id/remplacer — { coach_id, raison?, forcer? }
// Réaffecte la séance à un autre coach (et la remet au programme si elle était annulée), avec trace.
router.post('/:id/remplacer', (req, res) => {
  const seance = db.get('SELECT * FROM seances WHERE id = ?', [req.params.id]);
  if (!seance) return res.status(404).json({ error: 'Séance introuvable' });
  if (!['programme', 'annule'].includes(seance.statut)) {
    return res.status(409).json({ error: 'Cette séance est déjà effectuée : modifie le coach depuis sa fiche.' });
  }
  const coachId = Number(req.body.coach_id);
  const coach = Number.isInteger(coachId)
    ? db.get('SELECT id, prenom, nom FROM coaches WHERE id = ? AND actif = 1 AND supprime = 0', [coachId])
    : null;
  if (!coach) return res.status(400).json({ error: 'Choisis un coach actif.' });
  if (coach.id === seance.coach_id) return res.status(400).json({ error: 'Ce coach est déjà affecté à cette séance.' });
  const raison = String(req.body.raison || '').trim();
  if (raison.length > 300) return res.status(400).json({ error: 'Le motif est trop long (300 caractères au plus).' });

  const conflit = coursEnConflit(seance, coach.id);
  if (conflit && !req.body.forcer) {
    return res.status(409).json({ error: `${coach.prenom} a déjà un cours à ${conflit} ce jour-là.`, conflit: true });
  }

  db.run('BEGIN');
  try {
    db.run(`UPDATE seances SET coach_id = ?, statut = 'programme' WHERE id = ?`, [coach.id, seance.id]);
    db.run(
      `INSERT INTO modifications_ponctuelles (seance_id, type, ancien_coach_id, nouveau_coach_id, raison, auteur_id)
       VALUES (?, 'remplacement_coach', ?, ?, ?, ?)`,
      [seance.id, seance.coach_id, coach.id, raison || null, req.user?.id ?? null]
    );
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
  if (req.user) {
    db.run('INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'remplacement_coach', 'seances', seance.id, `coach ${seance.coach_id ?? '-'} -> ${coach.id}${raison ? ` (${raison})` : ''}`]);
  }
  res.json(db.get(`${SEANCE_SELECT} WHERE s.id = ?`, [seance.id]));
});

// DELETE /api/seances/:id
router.delete('/:id', (req, res) => {
  const existing = db.get('SELECT id FROM seances WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Séance introuvable' });
  db.run('DELETE FROM seances WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
