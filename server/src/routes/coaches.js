const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/coaches/recap?debut=YYYY-MM-DD&fin=YYYY-MM-DD&effectue=1&paye=1
// effectue/paye (défaut : tous deux inclus) contrôlent quels statuts comptent comme
// "heures réalisées" — un cours "payé" a bien eu lieu, au même titre qu'"effectué".
router.get('/recap', (req, res) => {
  // Défaut : 13 derniers mois
  const now = new Date();
  const defaultFin   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-28`;
  const d13          = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const defaultDebut = `${d13.getFullYear()}-${String(d13.getMonth()+1).padStart(2,'0')}-01`;
  const debut = req.query.debut || defaultDebut;
  const fin   = req.query.fin   || defaultFin;

  const inclureEffectue = req.query.effectue !== '0';
  const inclurePaye     = req.query.paye !== '0';
  const statuts = [];
  if (inclureEffectue) statuts.push('effectue');
  if (inclurePaye) statuts.push('paye');

  const coaches = db.all('SELECT id, prenom, nom, email, telephone, aqua, fitness, boxe, crosstraining, poledance, actif, siret, adresse, tarif_horaire FROM coaches WHERE supprime = 0 ORDER BY prenom, nom');
  const seances = statuts.length === 0 ? [] : db.all(
    `SELECT coach_id, SUBSTR(date,1,7) as mois, SUM(duree_minutes) as mins
     FROM seances
     WHERE statut IN (${statuts.map(() => '?').join(',')}) AND date BETWEEN ? AND ?
     GROUP BY coach_id, mois`,
    [...statuts, debut, fin]
  );

  const map = {};
  for (const c of coaches) {
    map[c.id] = { ...c, mois: {}, total: 0 };
  }
  for (const s of seances) {
    if (!map[s.coach_id]) continue;
    const h = Math.round((s.mins / 60) * 100) / 100;
    map[s.coach_id].mois[s.mois] = h;
    map[s.coach_id].total = Math.round((map[s.coach_id].total + h) * 100) / 100;
  }

  const result = Object.values(map).sort((a, b) => b.total - a.total);
  res.json({ coaches: result });
});

// GET /api/coaches/:id/seances-detail?debut=YYYY-MM-DD&fin=YYYY-MM-DD&effectue=1&paye=1
// Liste détaillée des séances d'un coach sur une période (cours, date, horaire,
// effectif) — alimente la fenêtre de détail au clic sur un nombre d'heures dans
// le récapitulatif. Mêmes filtres effectue/paye que /recap pour rester cohérent
// avec le total affiché.
router.get('/:id/seances-detail', (req, res) => {
  const coach = db.get('SELECT id FROM coaches WHERE id = ?', [req.params.id]);
  if (!coach) return res.status(404).json({ error: 'Coach introuvable' });

  const { debut, fin } = req.query;
  if (!debut || !fin) return res.status(400).json({ error: 'debut et fin requis' });

  const inclureEffectue = req.query.effectue !== '0';
  const inclurePaye     = req.query.paye !== '0';
  const statuts = [];
  if (inclureEffectue) statuts.push('effectue');
  if (inclurePaye) statuts.push('paye');
  if (statuts.length === 0) return res.json([]);

  const rows = db.all(
    `SELECT s.id, s.date, s.horaire, s.duree_minutes, s.statut, s.nb_presents,
            ct.nom AS cours_nom, ct.categorie AS cours_categorie
     FROM seances s JOIN cours_types ct ON ct.id = s.cours_type_id
     WHERE s.coach_id = ? AND s.statut IN (${statuts.map(() => '?').join(',')}) AND s.date BETWEEN ? AND ?
     ORDER BY s.date ASC, s.horaire ASC`,
    [req.params.id, ...statuts, debut, fin]
  );
  res.json(rows);
});

// GET /api/coaches/:id/stats — KPI d'un coach sur 3 périodes : 30 derniers jours,
// depuis le 1er septembre le plus récent, et de tout temps. Ne compte que les
// séances effectivement données (effectué/payé), comme le récapitulatif des heures.
router.get('/:id/stats', (req, res) => {
  const coach = db.get('SELECT id FROM coaches WHERE id = ?', [req.params.id]);
  if (!coach) return res.status(404).json({ error: 'Coach introuvable' });

  const now = new Date();
  const pad = (v) => String(v).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const il30j = new Date(now); il30j.setDate(il30j.getDate() - 30);
  const anneeSeptembre = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const depuisSeptembre = new Date(anneeSeptembre, 8, 1);

  function periode(debut) {
    const cond = debut ? 'date >= ?' : '1=1';
    const params = debut ? [req.params.id, debut] : [req.params.id];
    const row = db.get(
      `SELECT COUNT(*) AS nbCours,
              ROUND(SUM(duree_minutes) / 60.0, 2) AS heures,
              ROUND(AVG(CASE WHEN nb_presents IS NOT NULL THEN nb_presents END), 1) AS effectifMoyen
       FROM seances
       WHERE coach_id = ? AND statut IN ('effectue', 'paye') AND ${cond}`,
      params
    );
    return {
      nbCours: row.nbCours || 0,
      heures: row.heures || 0,
      effectifMoyen: row.effectifMoyen ?? null,
    };
  }

  res.json({
    derniers30j:     periode(iso(il30j)),
    depuisSeptembre: periode(iso(depuisSeptembre)),
    toutTemps:       periode(null),
  });
});

// GET /api/coaches — liste tous les coaches (actifs par défaut)
router.get('/', (req, res) => {
  const { tous } = req.query;
  const rows = tous
    ? db.all('SELECT * FROM coaches WHERE supprime = 0 ORDER BY nom, prenom')
    : db.all('SELECT * FROM coaches WHERE actif = 1 AND supprime = 0 ORDER BY nom, prenom');
  res.json(rows);
});

// GET /api/coaches/:id
router.get('/:id', (req, res) => {
  const coach = db.get('SELECT * FROM coaches WHERE id = ?', [req.params.id]);
  if (!coach) return res.status(404).json({ error: 'Coach introuvable' });
  res.json(coach);
});

// Convertit un tarif horaire saisi (chaîne ou nombre, facultatif) en REAL ou null.
function parseTarifHoraire(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// POST /api/coaches
router.post('/', (req, res) => {
  const { nom, prenom, email, telephone, aqua, fitness, boxe, crosstraining, poledance, siret, adresse, tarif_horaire } = req.body;
  if (!prenom || !prenom.trim()) {
    return res.status(400).json({ error: 'prenom est obligatoire' });
  }
  try {
    const result = db.run(
      'INSERT INTO coaches (nom, prenom, email, telephone, aqua, fitness, boxe, crosstraining, poledance, siret, adresse, tarif_horaire) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [(nom || '').trim(), prenom.trim(), email?.trim() || null, telephone?.trim() || null,
       aqua ? 1 : 0, fitness ? 1 : 0, boxe ? 1 : 0, crosstraining ? 1 : 0, poledance ? 1 : 0,
       siret?.trim() || null, adresse?.trim() || null, parseTarifHoraire(tarif_horaire)]
    );
    const created = db.get('SELECT * FROM coaches WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    throw err;
  }
});

// PUT /api/coaches/:id — mise à jour complète
router.put('/:id', (req, res) => {
  const { nom, prenom, email, telephone, aqua, fitness, boxe, crosstraining, poledance, siret, adresse, tarif_horaire } = req.body;
  if (!prenom || !prenom.trim()) {
    return res.status(400).json({ error: 'prenom est obligatoire' });
  }
  const existing = db.get('SELECT id FROM coaches WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Coach introuvable' });

  try {
    db.run(
      'UPDATE coaches SET nom = ?, prenom = ?, email = ?, telephone = ?, aqua = ?, fitness = ?, boxe = ?, crosstraining = ?, poledance = ?, siret = ?, adresse = ?, tarif_horaire = ? WHERE id = ?',
      [(nom || '').trim(), prenom.trim(), email?.trim() || null, telephone?.trim() || null,
       aqua ? 1 : 0, fitness ? 1 : 0, boxe ? 1 : 0, crosstraining ? 1 : 0, poledance ? 1 : 0,
       siret?.trim() || null, adresse?.trim() || null, parseTarifHoraire(tarif_horaire), req.params.id]
    );
    res.json(db.get('SELECT * FROM coaches WHERE id = ?', [req.params.id]));
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    throw err;
  }
});

// Catégories supplémentaires que l'Annuaire autorise pour un coach (au-delà de "coach").
const CATEGORIES_EXTRA_VALIDES = ['prestataire', 'employe', 'responsable'];

// PATCH /api/coaches/:id — édition rapide (téléphone + disciplines + catégories annuaire
// supplémentaires), sans repasser par le nom complet — utilisé par l'Annuaire pour
// modifier un coach sur place.
router.patch('/:id', (req, res) => {
  const existing = db.get('SELECT * FROM coaches WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Coach introuvable' });

  const fields = ['telephone', 'aqua', 'fitness', 'boxe', 'crosstraining', 'poledance', 'categories_extra'];
  const updates = {};
  for (const f of fields) if (f in req.body) updates[f] = req.body[f];

  const sets = Object.keys(updates).map(f => `${f} = ?`);
  if (sets.length === 0) return res.json(existing);
  const values = Object.entries(updates).map(([f, v]) => {
    if (f === 'telephone') return v?.trim() || null;
    if (f === 'categories_extra') {
      const list = Array.isArray(v) ? v : [];
      return list.filter(c => CATEGORIES_EXTRA_VALIDES.includes(c)).join(',');
    }
    return v ? 1 : 0;
  });
  db.run(`UPDATE coaches SET ${sets.join(', ')} WHERE id = ?`, [...values, req.params.id]);
  res.json(db.get('SELECT * FROM coaches WHERE id = ?', [req.params.id]));
});

// PATCH /api/coaches/:id/actif — active/désactive
router.patch('/:id/actif', (req, res) => {
  const { actif } = req.body;
  if (actif === undefined) return res.status(400).json({ error: 'actif requis' });
  const existing = db.get('SELECT id FROM coaches WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Coach introuvable' });
  db.run('UPDATE coaches SET actif = ? WHERE id = ?', [actif ? 1 : 0, req.params.id]);
  res.json(db.get('SELECT * FROM coaches WHERE id = ?', [req.params.id]));
});

// DELETE /api/coaches/:id — désactive (soft) ; avec ?definitif=1 : suppression
// définitive (la ligne reste en DB pour l'historique des séances passées).
router.delete('/:id', (req, res) => {
  const existing = db.get('SELECT id FROM coaches WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Coach introuvable' });
  if (req.query.definitif === '1') {
    db.run('UPDATE coaches SET supprime = 1, actif = 0 WHERE id = ?', [req.params.id]);
  } else {
    db.run('UPDATE coaches SET actif = 0 WHERE id = ?', [req.params.id]);
  }
  res.json({ ok: true });
});

module.exports = router;
