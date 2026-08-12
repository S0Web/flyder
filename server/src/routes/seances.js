const express = require('express');
const router = express.Router();
const db = require('../db/database');

const SEANCE_SELECT = `
  SELECT
    s.id, s.date, s.horaire, s.duree_minutes, s.statut, s.nb_presents, s.notes,
    s.cours_type_id, ct.nom AS cours_nom, ct.categorie,
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
    const existing = db.get('SELECT id, pointeur_user_id FROM seances WHERE id = ?', [req.params.id]);
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

// DELETE /api/seances/:id
router.delete('/:id', (req, res) => {
  const existing = db.get('SELECT id FROM seances WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Séance introuvable' });
  db.run('DELETE FROM seances WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
