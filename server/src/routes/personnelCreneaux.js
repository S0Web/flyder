const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { upsertJour } = require('../db/personnelWrite');
const { soldeCp, prisDepuisContrat } = require('../lib/cp');
const { getPreference } = require('../lib/preferences');

function getSemaineBounds(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
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

// GET /api/personnel-creneaux?semaine=YYYY-MM-DD
router.get('/', (req, res) => {
  const { lundi, dimanche } = getSemaineBounds(req.query.semaine || todayISO());
  const rows = db.all(
    `SELECT pc.*, u.prenom, u.nom
     FROM personnel_creneaux pc
     JOIN app_users u ON u.id = pc.employe_id
     WHERE pc.date BETWEEN ? AND ?
     ORDER BY pc.employe_id, pc.date, pc.ordre`,
    [lundi, dimanche]
  );
  res.json(rows);
});

// GET /api/personnel-creneaux/cp-summary — CP pris ce mois / cette année + solde cumulé
// (2,5j/mois depuis la date de début de contrat, + ajustement manuel ; les CP posés
// avant la date de contrat ne comptent pas). Seuls les profils avec une date de contrat
// renseignée apparaissent (sans date = CDD/extra, pas de suivi de cumul). Manager : tout
// le monde (actifs). Sinon : soi-même.
router.get('/cp-summary', (req, res) => {
  const now = new Date();
  const anneeCourante = String(now.getFullYear());
  const moisCourant = `${anneeCourante}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const taux = parseFloat(getPreference('conges_taux_mensuel'));

  function withDetails(rows) {
    return rows.filter(r => r.date_debut_contrat).map(r => {
      const totalPris = prisDepuisContrat(r.id, r.date_debut_contrat);
      const prisAnnee = prisDepuisContrat(r.id, r.date_debut_contrat, `AND strftime('%Y', date) = ?`, [anneeCourante]);
      const prisMois = prisDepuisContrat(r.id, r.date_debut_contrat, `AND strftime('%Y-%m', date) = ?`, [moisCourant]);
      const { restant } = soldeCp(r.date_debut_contrat, r.cp_ajuste, totalPris, taux);
      return { id: r.id, prenom: r.prenom, nom: r.nom, prisMois, prisAnnee, restant };
    });
  }

  if (req.user.role === 'manager') {
    const rows = db.all(
      `SELECT id, prenom, nom, date_debut_contrat, cp_ajuste FROM app_users WHERE actif = 1 AND masque = 0 ORDER BY prenom`
    );
    return res.json(withDetails(rows));
  }
  const row = db.get(
    `SELECT id, prenom, nom, date_debut_contrat, cp_ajuste FROM app_users WHERE id = ?`,
    [req.user.id]
  );
  res.json(withDetails([row]));
});

// GET /api/personnel-creneaux/recap?debut&fin — heures travaillées + CP par employé par mois
// (aide paie). Manager : tout le monde. Sinon : seulement soi-même.
router.get('/recap', (req, res) => {
  const now = new Date();
  const defaultFin   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-28`;
  const d12          = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const defaultDebut = `${d12.getFullYear()}-${String(d12.getMonth()+1).padStart(2,'0')}-01`;
  const debut = req.query.debut || defaultDebut;
  const fin   = req.query.fin   || defaultFin;

  const isManager = req.user.role === 'manager';
  const employes = isManager
    ? db.all('SELECT id, prenom, nom, actif FROM app_users WHERE masque = 0 ORDER BY prenom, nom')
    : db.all('SELECT id, prenom, nom, actif FROM app_users WHERE id = ?', [req.user.id]);

  const rows = db.all(
    `SELECT employe_id, date, type, debut, fin FROM personnel_creneaux
     WHERE date BETWEEN ? AND ? AND employe_id IN (${employes.map(() => '?').join(',') || 'NULL'})`,
    [debut, fin, ...employes.map(e => e.id)]
  );

  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const map = {};
  for (const e of employes) map[e.id] = { ...e, mois: {}, total: 0, cpMois: {}, cpTotal: 0 };

  for (const r of rows) {
    const employe = map[r.employe_id];
    if (!employe) continue;
    const mois = r.date.slice(0, 7);
    if (r.type === 'travail' && r.debut && r.fin) {
      const heures = (toMin(r.fin) - toMin(r.debut)) / 60;
      employe.mois[mois] = (employe.mois[mois] || 0) + heures;
      employe.total += heures;
    } else if (r.type === 'cp') {
      employe.cpMois[mois] = (employe.cpMois[mois] || 0) + 1;
      employe.cpTotal += 1;
    }
  }

  const round2 = (n) => Math.round(n * 100) / 100;
  const result = Object.values(map)
    .map(e => ({
      ...e,
      total: round2(e.total),
      mois: Object.fromEntries(Object.entries(e.mois).map(([k, v]) => [k, round2(v)])),
    }))
    .sort((a, b) => b.total - a.total);

  res.json({ employes: result });
});

// POST /api/personnel-creneaux/dupliquer — copie une semaine vers une autre, tous employés confondus,
// en sautant les jours déjà renseignés dans la semaine cible (n'écrase jamais une saisie existante).
router.post('/dupliquer', (req, res) => {
  const { semaine_source, semaine_cible } = req.body;
  if (!semaine_source || !semaine_cible) {
    return res.status(400).json({ error: 'semaine_source et semaine_cible requis' });
  }

  const { lundi: ls, dimanche: ds } = getSemaineBounds(semaine_source);
  const { lundi: lc } = getSemaineBounds(semaine_cible);

  const sources = db.all(
    'SELECT * FROM personnel_creneaux WHERE date BETWEEN ? AND ? ORDER BY employe_id, date, ordre',
    [ls, ds]
  );
  if (sources.length === 0) {
    return res.status(404).json({ error: 'Aucun créneau dans la semaine source' });
  }

  const diffDays = Math.round((new Date(lc + 'T00:00:00') - new Date(ls + 'T00:00:00')) / 86400000);
  const pad = (n) => String(n).padStart(2, '0');
  function shiftDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + diffDays);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Regroupe les lignes source par employé + jour (un jour "travail" peut avoir plusieurs segments/coupures)
  const jours = new Map();
  for (const c of sources) {
    const key = `${c.employe_id}|${c.date}`;
    if (!jours.has(key)) jours.set(key, { employe_id: c.employe_id, date: c.date, type: c.type, segments: [], notes: null });
    const jour = jours.get(key);
    if (c.type === 'travail') jour.segments.push({ debut: c.debut, fin: c.fin });
    if (c.notes) jour.notes = c.notes;
  }

  let copies = 0, ignores = 0;
  for (const jour of jours.values()) {
    const newDate = shiftDate(jour.date);
    const existing = db.get('SELECT id FROM personnel_creneaux WHERE employe_id = ? AND date = ?', [jour.employe_id, newDate]);
    if (existing) { ignores++; continue; }
    upsertJour(jour.employe_id, newDate, { type: jour.type, segments: jour.segments, notes: jour.notes });
    copies++;
  }

  if (req.user) {
    db.run('INSERT INTO audit_log (user_id, action, entity, details) VALUES (?, ?, ?, ?)',
      [req.user.id, 'dupliquer_semaine_personnel', 'personnel_creneaux',
       `${semaine_source} → ${semaine_cible} : ${copies} jour(s) copié(s), ${ignores} ignoré(s) (déjà renseigné)`]);
  }

  res.json({ ok: true, copies, ignores });
});

// PUT /api/personnel-creneaux/:employe_id/:date — upsert jour complet
router.put('/:employe_id/:date', (req, res) => {
  const { employe_id, date } = req.params;
  const employe = db.get('SELECT id FROM app_users WHERE id = ?', [employe_id]);
  if (!employe) return res.status(404).json({ error: 'Profil introuvable' });

  try {
    upsertJour(employe_id, date, req.body);

    if (req.user) {
      db.run('INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'update_personnel_creneau', 'personnel_creneaux', employe_id, `${date}: ${req.body.type || 'travail'}`]);
    }

    const rows = db.all('SELECT * FROM personnel_creneaux WHERE employe_id = ? AND date = ? ORDER BY ordre', [employe_id, date]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
