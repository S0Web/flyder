const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireManager } = require('../middleware/auth');
const { requireWriteAccess } = require('../middleware/ipAccess');
const { soldeCp, prisDepuisContrat } = require('../lib/cp');
const { getPreference } = require('../lib/preferences');
const { dateLocaleISO, ajouterJours, lundiDe } = require('../lib/dates');

// Onglet Équipe : fiches de poste, comptes rendus de fin de journée, notes
// privées, et les deux tableaux de bord (vue d'ensemble manager / ma journée).
// Monté derrière requireAuth (index.js).

const estManager = (req) => req.user.role === 'manager';
const soiOuManager = (req, userId) => estManager(req) || req.user.id === Number(userId);

const MEMBRES_ACTIFS = 'actif = 1 AND supprime = 0 AND masque = 0';

function parseListe(json) {
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}

function nettoyerListe(liste) {
  return (Array.isArray(liste) ? liste : [])
    .map(s => String(s ?? '').trim())
    .filter(Boolean)
    .slice(0, 40);
}

// ─── Fiche de poste ───────────────────────────────────────────────────────────

function lireFiche(userId) {
  const f = db.get('SELECT * FROM fiches_poste WHERE user_id = ?', [userId]);
  if (!f) return { user_id: Number(userId), intitule: '', objectif: '', missions: [], indicateurs: [], rappel: '', updated_at: null };
  return { ...f, missions: parseListe(f.missions), indicateurs: parseListe(f.indicateurs) };
}

router.get('/fiches-poste/:userId', (req, res) => {
  if (!soiOuManager(req, req.params.userId)) return res.status(403).json({ error: 'Accès refusé' });
  res.json(lireFiche(req.params.userId));
});

router.put('/fiches-poste/:userId', requireManager, (req, res) => {
  const userId = Number(req.params.userId);
  if (!db.get('SELECT 1 FROM app_users WHERE id = ?', [userId])) return res.status(404).json({ error: 'Membre introuvable' });
  const { intitule, objectif, missions, indicateurs, rappel } = req.body;
  db.run(
    `INSERT INTO fiches_poste (user_id, intitule, objectif, missions, indicateurs, rappel, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET intitule=excluded.intitule, objectif=excluded.objectif,
       missions=excluded.missions, indicateurs=excluded.indicateurs, rappel=excluded.rappel,
       updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
    [userId, String(intitule || '').trim(), String(objectif || '').trim(),
     JSON.stringify(nettoyerListe(missions)), JSON.stringify(nettoyerListe(indicateurs)),
     String(rappel || '').trim(), req.user.id]
  );
  res.json(lireFiche(userId));
});

// ─── Comptes rendus ───────────────────────────────────────────────────────────

function formaterCr(cr) {
  if (!cr) return null;
  return { ...cr, missions: parseListe(cr.missions), indicateurs: parseListe(cr.indicateurs) };
}

const SELECT_CR = `
  SELECT cr.*, u.prenom, u.nom, v.prenom AS valide_par_prenom
  FROM comptes_rendus cr
  JOIN app_users u ON u.id = cr.user_id
  LEFT JOIN app_users v ON v.id = cr.valide_par
`;

// GET /api/equipe/comptes-rendus?user_id=&statut=&debut=&fin=
router.get('/comptes-rendus', (req, res) => {
  const where = ["cr.statut != 'brouillon' OR cr.user_id = ?"];
  const params = [req.user.id];
  if (!estManager(req)) {
    where.push('cr.user_id = ?'); params.push(req.user.id);
  } else if (req.query.user_id) {
    where.push('cr.user_id = ?'); params.push(Number(req.query.user_id));
  }
  if (req.query.statut) { where.push('cr.statut = ?'); params.push(req.query.statut); }
  if (req.query.debut)  { where.push('cr.date >= ?'); params.push(req.query.debut); }
  if (req.query.fin)    { where.push('cr.date <= ?'); params.push(req.query.fin); }
  const rows = db.all(
    `${SELECT_CR} WHERE ${where.map(w => `(${w})`).join(' AND ')} ORDER BY cr.date DESC, u.prenom LIMIT 1000`,
    params
  );
  res.json(rows.map(formaterCr));
});

// GET /api/equipe/comptes-rendus/moi/:date — mon compte rendu du jour (ou null),
// avec ma fiche de poste pour préremplir missions et indicateurs.
router.get('/comptes-rendus/moi/:date', (req, res) => {
  const cr = db.get(`${SELECT_CR} WHERE cr.user_id = ? AND cr.date = ?`, [req.user.id, req.params.date]);
  res.json({ compte_rendu: formaterCr(cr), fiche: lireFiche(req.user.id) });
});

// PUT /api/equipe/comptes-rendus/moi/:date — enregistrer (brouillon) ou soumettre.
// Modifiable tant qu'il n'est pas validé ; jamais pour une date future, ni plus
// de 7 jours en arrière (le bilan se fait le jour même).
router.put('/comptes-rendus/moi/:date', requireWriteAccess, (req, res) => {
  const date = req.params.date;
  const aujourdhui = dateLocaleISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > aujourdhui || date < ajouterJours(aujourdhui, -7)) {
    return res.status(400).json({ error: 'Date de compte rendu invalide' });
  }
  const existant = db.get('SELECT * FROM comptes_rendus WHERE user_id = ? AND date = ?', [req.user.id, date]);
  if (existant?.statut === 'valide') return res.status(409).json({ error: 'Ce compte rendu est déjà validé.' });

  const b = req.body;
  const missions = (Array.isArray(b.missions) ? b.missions : [])
    .map(m => ({ texte: String(m?.texte || '').trim(), fait: !!m?.fait })).filter(m => m.texte).slice(0, 40);
  const indicateurs = (Array.isArray(b.indicateurs) ? b.indicateurs : [])
    .map(i => ({ libelle: String(i?.libelle || '').trim(), valeur: String(i?.valeur ?? '').trim().slice(0, 200) }))
    .filter(i => i.libelle).slice(0, 40);
  const soumettre = !!b.soumettre;
  const statut = soumettre ? 'soumis' : (existant?.statut === 'a_revoir' ? 'a_revoir' : (existant?.statut || 'brouillon'));
  const valeurs = [
    JSON.stringify(missions), JSON.stringify(indicateurs),
    String(b.resume || '').trim(), String(b.priorite_demain || '').trim(), String(b.probleme || '').trim(),
    statut,
  ];

  if (existant) {
    db.run(
      `UPDATE comptes_rendus SET missions=?, indicateurs=?, resume=?, priorite_demain=?, probleme=?, statut=?,
         soumis_le = CASE WHEN ? THEN datetime('now') ELSE soumis_le END, updated_at=datetime('now')
       WHERE id = ?`,
      [...valeurs, soumettre ? 1 : 0, existant.id]
    );
  } else {
    db.run(
      `INSERT INTO comptes_rendus (user_id, date, missions, indicateurs, resume, priorite_demain, probleme, statut, soumis_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? THEN datetime('now') END)`,
      [req.user.id, date, ...valeurs, soumettre ? 1 : 0]
    );
  }
  res.json(formaterCr(db.get(`${SELECT_CR} WHERE cr.user_id = ? AND cr.date = ?`, [req.user.id, date])));
});

// POST /api/equipe/comptes-rendus/:id/decision — { decision: 'valide'|'a_revoir', retour }
router.post('/comptes-rendus/:id/decision', requireManager, (req, res) => {
  const cr = db.get('SELECT * FROM comptes_rendus WHERE id = ?', [req.params.id]);
  if (!cr || cr.statut === 'brouillon') return res.status(404).json({ error: 'Compte rendu introuvable' });
  if (cr.user_id === req.user.id) return res.status(403).json({ error: 'Un autre manager doit valider ton propre compte rendu.' });
  const decision = req.body.decision === 'a_revoir' ? 'a_revoir' : 'valide';
  const retour = String(req.body.retour || '').trim();
  if (decision === 'a_revoir' && !retour) {
    return res.status(400).json({ error: 'Indique ce qui est à revoir.' });
  }
  db.run(
    `UPDATE comptes_rendus SET statut=?, retour_manager=?, valide_par=?, valide_le=datetime('now'), updated_at=datetime('now')
     WHERE id = ?`,
    [decision, retour, req.user.id, cr.id]
  );
  res.json(formaterCr(db.get(`${SELECT_CR} WHERE cr.id = ?`, [cr.id])));
});

// ─── Notes privées (strictement personnelles, managers compris) ───────────────

router.get('/notes', (req, res) => {
  res.json(db.all('SELECT * FROM notes_privees WHERE user_id = ? ORDER BY epingle DESC, updated_at DESC', [req.user.id]));
});

router.post('/notes', (req, res) => {
  const result = db.run('INSERT INTO notes_privees (user_id, titre, contenu) VALUES (?, ?, ?)',
    [req.user.id, String(req.body.titre || '').trim(), String(req.body.contenu || '')]);
  res.status(201).json(db.get('SELECT * FROM notes_privees WHERE id = ?', [result.lastInsertRowid]));
});

router.put('/notes/:id', (req, res) => {
  const note = db.get('SELECT * FROM notes_privees WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!note) return res.status(404).json({ error: 'Note introuvable' });
  const b = req.body;
  db.run(`UPDATE notes_privees SET titre=?, contenu=?, epingle=?, updated_at=datetime('now') WHERE id=?`, [
    b.titre !== undefined ? String(b.titre).trim() : note.titre,
    b.contenu !== undefined ? String(b.contenu) : note.contenu,
    b.epingle !== undefined ? (b.epingle ? 1 : 0) : note.epingle,
    note.id,
  ]);
  res.json(db.get('SELECT * FROM notes_privees WHERE id = ?', [note.id]));
});

router.delete('/notes/:id', (req, res) => {
  db.run('DELETE FROM notes_privees WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ─── Tableaux de bord ─────────────────────────────────────────────────────────

function cpRestant(userId) {
  const u = db.get('SELECT date_debut_contrat, cp_ajuste FROM app_users WHERE id = ?', [userId]);
  if (!u?.date_debut_contrat) return null;
  const taux = parseFloat(getPreference('conges_taux_mensuel'));
  return soldeCp(u.date_debut_contrat, u.cp_ajuste, prisDepuisContrat(userId, u.date_debut_contrat), taux).restant;
}

function creneauxEntre(debut, fin, userId) {
  return db.all(
    `SELECT pc.id, pc.employe_id, pc.date, pc.type, pc.debut, pc.fin, pc.ordre, u.prenom, u.nom
     FROM personnel_creneaux pc JOIN app_users u ON u.id = pc.employe_id
     WHERE pc.date BETWEEN ? AND ? ${userId ? 'AND pc.employe_id = ?' : ''}
     ORDER BY pc.date, pc.debut, pc.ordre`,
    userId ? [debut, fin, userId] : [debut, fin]
  );
}

// Qui est là aujourd'hui : créneaux de travail groupés par personne, et absences.
function presencesDuJour(date) {
  const parPersonne = new Map();
  for (const c of creneauxEntre(date, date)) {
    if (!parPersonne.has(c.employe_id)) {
      parPersonne.set(c.employe_id, { id: c.employe_id, prenom: c.prenom, nom: c.nom, creneaux: [], absence: null });
    }
    const p = parPersonne.get(c.employe_id);
    if (c.type === 'travail') p.creneaux.push({ debut: c.debut, fin: c.fin });
    else p.absence = c.type;
  }
  const intitules = new Map(db.all('SELECT user_id, intitule FROM fiches_poste').map(f => [f.user_id, f.intitule]));
  return [...parPersonne.values()]
    .map(p => ({ ...p, intitule: intitules.get(p.id) || '' }))
    .sort((a, b) => (a.creneaux[0]?.debut || '99').localeCompare(b.creneaux[0]?.debut || '99'));
}

// GET /api/equipe/vue-ensemble — tableau de bord manager.
router.get('/vue-ensemble', requireManager, (req, res) => {
  const aujourdhui = dateLocaleISO();
  const lundi = lundiDe(aujourdhui);
  const membres = db.all(`SELECT id, prenom, nom, role FROM app_users WHERE ${MEMBRES_ACTIFS} ORDER BY prenom, nom`);
  const ids = new Set(membres.map(m => m.id));

  const taches = db.all(`SELECT id, assigne_a, statut, echeance, fait_le, created_at FROM taches`);
  const ouvertes = taches.filter(t => t.statut !== 'fait' && ids.has(t.assigne_a));
  const enRetard = ouvertes.filter(t => t.echeance && t.echeance < aujourdhui);
  const semaineTaches = taches.filter(t => t.echeance && t.echeance >= lundi && t.echeance <= ajouterJours(lundi, 6));
  const tauxSemaine = semaineTaches.length
    ? Math.round((semaineTaches.filter(t => t.statut === 'fait').length / semaineTaches.length) * 100)
    : null;

  // Un manager ne valide pas son propre bilan (c'est à un autre manager de le faire).
  const crAValider = db.all(
    `${SELECT_CR} WHERE cr.statut = 'soumis' AND cr.user_id != ? ORDER BY cr.date DESC, cr.soumis_le DESC`,
    [req.user.id]
  ).map(formaterCr);

  // Tendance sur 8 semaines : tâches terminées vs tâches créées, par semaine.
  const tendance = [];
  for (let i = 7; i >= 0; i--) {
    const debut = ajouterJours(lundi, -7 * i);
    const fin = ajouterJours(debut, 6);
    const dansSemaine = (dt) => dt && dt.slice(0, 10) >= debut && dt.slice(0, 10) <= fin;
    tendance.push({
      semaine: debut,
      faites: taches.filter(t => t.statut === 'fait' && dansSemaine(t.fait_le)).length,
      creees: taches.filter(t => dansSemaine(t.created_at)).length,
    });
  }

  // Charge par membre.
  const septJours = ajouterJours(aujourdhui, -7);
  const charge = membres.map(m => ({
    id: m.id, prenom: m.prenom, nom: m.nom,
    ouvertes: ouvertes.filter(t => t.assigne_a === m.id).length,
    en_retard: enRetard.filter(t => t.assigne_a === m.id).length,
    faites_7j: taches.filter(t => t.assigne_a === m.id && t.statut === 'fait' && t.fait_le?.slice(0, 10) >= septJours).length,
  }));

  // Suivi des comptes rendus sur 14 jours : une case par membre et par jour,
  // croisée avec le planning (un jour non travaillé n'appelle pas de bilan).
  const jours = Array.from({ length: 14 }, (_, i) => ajouterJours(aujourdhui, i - 13));
  const crPeriode = db.all('SELECT user_id, date, statut FROM comptes_rendus WHERE date >= ?', [jours[0]]);
  const travailPeriode = db.all(
    "SELECT DISTINCT employe_id, date FROM personnel_creneaux WHERE type = 'travail' AND date >= ? AND date <= ?",
    [jours[0], aujourdhui]
  );
  // Un membre sans aucun jour travaillé ni bilan sur la période (profil technique,
  // salarié absent longue durée…) n'apporterait qu'une ligne vide.
  const suiviCr = membres.map(m => ({
    id: m.id, prenom: m.prenom, nom: m.nom,
    jours: Object.fromEntries(jours.map(d => {
      const cr = crPeriode.find(c => c.user_id === m.id && c.date === d);
      const travaille = travailPeriode.some(t => t.employe_id === m.id && t.date === d);
      return [d, { statut: cr?.statut || null, travaille }];
    })),
  })).filter(m => Object.values(m.jours).some(j => j.travaille || j.statut));

  const absencesAVenir = db.all(
    `SELECT pc.employe_id AS id, u.prenom, u.nom, pc.date, pc.type
     FROM personnel_creneaux pc JOIN app_users u ON u.id = pc.employe_id
     WHERE pc.type IN ('cp','arret','ecole','absent') AND pc.date BETWEEN ? AND ?
     ORDER BY pc.date, u.prenom`,
    [aujourdhui, ajouterJours(aujourdhui, 21)]
  );

  const problemes = db.all(
    `${SELECT_CR} WHERE cr.statut != 'brouillon' AND trim(cr.probleme) != '' AND cr.date >= ?
     ORDER BY cr.date DESC LIMIT 8`,
    [septJours]
  ).map(formaterCr);

  const docsNonConsultes = db.get(
    `SELECT COUNT(*) AS n FROM employe_documents d JOIN app_users u ON u.id = d.user_id
     WHERE d.vu_le IS NULL AND u.actif = 1 AND u.supprime = 0`
  ).n;

  const presents = presencesDuJour(aujourdhui);

  res.json({
    date: aujourdhui,
    kpi: {
      membres: membres.length,
      presents: presents.filter(p => p.creneaux.length).length,
      taches_ouvertes: ouvertes.length,
      taches_en_retard: enRetard.length,
      taux_semaine: tauxSemaine,
      cr_a_valider: crAValider.length,
      cr_du_jour: crPeriode.filter(c => c.date === aujourdhui && c.statut !== 'brouillon').length,
      docs_non_consultes: docsNonConsultes,
    },
    presents,
    cr_a_valider: crAValider,
    charge,
    tendance,
    suivi_cr: { jours, membres: suiviCr },
    absences_a_venir: absencesAVenir,
    problemes,
  });
});

// GET /api/equipe/membres — annuaire interne pour le manager, avec les indicateurs
// clés de chaque fiche.
router.get('/membres', requireManager, (req, res) => {
  const aujourdhui = dateLocaleISO();
  const lundi = lundiDe(aujourdhui);
  const membres = db.all(
    `SELECT id, prenom, nom, email, role, actif, date_debut_contrat FROM app_users
     WHERE supprime = 0 AND masque = 0 ORDER BY actif DESC, prenom, nom`
  );
  const heuresSemaine = new Map(db.all(
    `SELECT employe_id, SUM((CAST(substr(fin,1,2) AS INTEGER)*60 + CAST(substr(fin,4,2) AS INTEGER))
                         - (CAST(substr(debut,1,2) AS INTEGER)*60 + CAST(substr(debut,4,2) AS INTEGER))) AS minutes
     FROM personnel_creneaux WHERE type = 'travail' AND debut IS NOT NULL AND fin IS NOT NULL
       AND date BETWEEN ? AND ? GROUP BY employe_id`,
    [lundi, ajouterJours(lundi, 6)]
  ).map(r => [r.employe_id, r.minutes]));

  res.json(membres.map(m => {
    const fiche = lireFiche(m.id);
    const t = db.get(
      `SELECT SUM(statut != 'fait') AS ouvertes,
              SUM(statut != 'fait' AND echeance < ?) AS en_retard
       FROM taches WHERE assigne_a = ?`,
      [aujourdhui, m.id]
    );
    const dernierCr = db.get(
      "SELECT date, statut FROM comptes_rendus WHERE user_id = ? AND statut != 'brouillon' ORDER BY date DESC LIMIT 1",
      [m.id]
    );
    return {
      ...m,
      intitule: fiche.intitule,
      objectif: fiche.objectif,
      nb_missions: fiche.missions.length,
      taches_ouvertes: t.ouvertes || 0,
      taches_en_retard: t.en_retard || 0,
      dernier_cr: dernierCr || null,
      minutes_semaine: heuresSemaine.get(m.id) || 0,
      cp_restant: cpRestant(m.id),
      docs_non_consultes: db.get('SELECT COUNT(*) AS n FROM employe_documents WHERE user_id = ? AND vu_le IS NULL', [m.id]).n,
    };
  }));
});

// GET /api/equipe/membres/:id/resume — chiffres de l'aperçu d'une fiche membre.
router.get('/membres/:id/resume', (req, res) => {
  if (!soiOuManager(req, req.params.id)) return res.status(403).json({ error: 'Accès refusé' });
  const id = Number(req.params.id);
  const aujourdhui = dateLocaleISO();
  const lundi = lundiDe(aujourdhui);
  const t = db.get(
    `SELECT SUM(statut != 'fait') AS ouvertes,
            SUM(statut != 'fait' AND echeance < ?) AS en_retard,
            SUM(statut = 'fait' AND fait_le >= datetime('now', '-30 days')) AS faites_30j
     FROM taches WHERE assigne_a = ?`,
    [aujourdhui, id]
  );
  const cr = db.get(
    `SELECT COUNT(*) AS total, SUM(statut = 'valide') AS valides
     FROM comptes_rendus WHERE user_id = ? AND statut != 'brouillon' AND date >= ?`,
    [id, ajouterJours(aujourdhui, -30)]
  );
  const joursTravailles30 = db.get(
    `SELECT COUNT(DISTINCT date) AS n FROM personnel_creneaux
     WHERE employe_id = ? AND type = 'travail' AND date BETWEEN ? AND ?`,
    [id, ajouterJours(aujourdhui, -30), aujourdhui]
  ).n;
  res.json({
    taches_ouvertes: t.ouvertes || 0,
    taches_en_retard: t.en_retard || 0,
    taches_faites_30j: t.faites_30j || 0,
    cr_30j: cr.total || 0,
    cr_valides_30j: cr.valides || 0,
    jours_travailles_30j: joursTravailles30,
    cp_restant: cpRestant(id),
    docs_non_consultes: db.get('SELECT COUNT(*) AS n FROM employe_documents WHERE user_id = ? AND vu_le IS NULL', [id]).n,
    creneaux_semaine: creneauxEntre(lundi, ajouterJours(lundi, 6), id),
  });
});

// GET /api/equipe/ma-journee — tableau de bord du salarié connecté.
router.get('/ma-journee', (req, res) => {
  const aujourdhui = dateLocaleISO();
  const lundi = lundiDe(aujourdhui);
  const me = req.user.id;

  const taches = db.all(
    `SELECT t.*, c.prenom AS cree_par_prenom, c.nom AS cree_par_nom
     FROM taches t JOIN app_users c ON c.id = t.cree_par
     WHERE t.assigne_a = ? AND (t.statut != 'fait' OR date(t.fait_le) = date('now'))
     ORDER BY (t.echeance IS NULL), t.echeance,
       CASE t.priorite WHEN 'urgente' THEN 0 WHEN 'haute' THEN 1 WHEN 'normale' THEN 2 ELSE 3 END`,
    [me]
  );
  const crDuJour = db.get('SELECT id, statut, retour_manager FROM comptes_rendus WHERE user_id = ? AND date = ?', [me, aujourdhui]);
  const crARevoir = db.all(
    "SELECT id, date, retour_manager FROM comptes_rendus WHERE user_id = ? AND statut = 'a_revoir' ORDER BY date DESC",
    [me]
  );

  res.json({
    date: aujourdhui,
    fiche: lireFiche(me),
    mes_creneaux: creneauxEntre(lundi, ajouterJours(lundi, 6), me),
    collegues: presencesDuJour(aujourdhui),
    taches,
    faites_7j: db.get(
      "SELECT COUNT(*) AS n FROM taches WHERE assigne_a = ? AND statut = 'fait' AND fait_le >= datetime('now', '-7 days')",
      [me]
    ).n,
    cr_du_jour: crDuJour || null,
    cr_a_revoir: crARevoir,
    docs_non_consultes: db.get('SELECT COUNT(*) AS n FROM employe_documents WHERE user_id = ? AND vu_le IS NULL', [me]).n,
    cp_restant: cpRestant(me),
  });
});

// GET /api/equipe/pastille — nombre affiché sur l'entrée « Équipe » du menu :
// comptes rendus à valider (manager), sinon ce qui attend le salarié.
router.get('/pastille', (req, res) => {
  if (estManager(req)) {
    return res.json({ count: db.get("SELECT COUNT(*) AS n FROM comptes_rendus WHERE statut = 'soumis' AND user_id != ?", [req.user.id]).n });
  }
  const aujourdhui = dateLocaleISO();
  const n = db.get("SELECT COUNT(*) AS n FROM taches WHERE assigne_a = ? AND statut != 'fait' AND echeance < ?", [req.user.id, aujourdhui]).n
    + db.get("SELECT COUNT(*) AS n FROM comptes_rendus WHERE user_id = ? AND statut = 'a_revoir'", [req.user.id]).n
    + db.get('SELECT COUNT(*) AS n FROM employe_documents WHERE user_id = ? AND vu_le IS NULL', [req.user.id]).n;
  res.json({ count: n });
});

module.exports = router;
