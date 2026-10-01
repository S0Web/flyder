const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireAuth, requireManager } = require('../middleware/auth');
const { isPrivileged } = require('../middleware/ipAccess');
const { soldeCp, prisDepuisContrat } = require('../lib/cp');
const { getPreference } = require('../lib/preferences');
const { logAudit } = require('../lib/audit');

const CHAMPS_USER = 'id, prenom, nom, email, role, actif, date_debut_contrat, heures_contrat_semaine, coach_id';

// Fiche coach reliée au profil : vide = aucune ; sinon une fiche coach existante, pas déjà
// reliée à un autre profil. `idUser` exclut le profil lui-même de la recherche de doublon.
// Renvoie undefined si la valeur est absente de la requête (champ à laisser inchangé).
function lireCoachId(v, idUser) {
  if (v === undefined) return { valeur: undefined };
  if (v === null || v === '') return { valeur: null };
  const id = Number(v);
  if (!Number.isInteger(id)) return { erreur: 'Fiche coach invalide.' };
  if (!db.get('SELECT id FROM coaches WHERE id = ? AND supprime = 0', [id])) return { erreur: 'Fiche coach introuvable.' };
  const autre = db.get(
    'SELECT prenom, nom FROM app_users WHERE coach_id = ? AND supprime = 0 AND id != ?', [id, idUser ?? 0]);
  if (autre) return { erreur: `Cette fiche coach est déjà reliée au profil de ${`${autre.prenom} ${autre.nom || ''}`.trim()}.`, statut: 409 };
  return { valeur: id };
}

// Heures de contrat hebdomadaires : vide = pas de suivi ; sinon un nombre d'heures entre 0 et 80.
// Renvoie undefined si la valeur est absente de la requête (champ à laisser inchangé).
function lireHeuresContrat(v) {
  if (v === undefined) return { valeur: undefined };
  if (v === null || v === '') return { valeur: null };
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 80) return { erreur: 'Heures de contrat invalides : un nombre d\'heures par semaine entre 0 et 80.' };
  return { valeur: Math.round(n * 100) / 100 };
}

// GET /api/app-users — liste (manager seulement) — hors profils supprimés
router.get('/', requireManager, (req, res) => {
  const users = db.all(`SELECT ${CHAMPS_USER}, created_at FROM app_users WHERE supprime = 0 AND masque = 0 ORDER BY prenom, nom`);
  res.json(users);
});

// Regroupement des actions en grandes catégories lisibles pour le filtre
// "Portée" côté client — une action technique (ex. update_seance) ne dit rien
// à un manager, "Planning des cours" si. Le mapping inverse (action -> clé)
// sert à construire le IN (...) ci-dessous.
const CATEGORIES = {
  cours:      ['update_seance'],
  personnel:  ['update_personnel_creneau', 'dupliquer_semaine_personnel', 'decision_conge', 'demande_conge'],
  comptes:    ['create_user', 'delete_user', 'create_profile', 'seed_admin_account', 'recover_manager', 'update_user', 'cp_ajuste'],
  connexions: ['switch_profile', 'dev_access_login'],
  // Interventions dans l'onglet Équipe qui ne touchent pas directement la ligne
  // app_users (sinon elles seraient dans "comptes") : fiches de poste, bilans,
  // tâches, incidents, documents, notes de suivi. Les notes privées (strictement
  // personnelles, même pour les autres managers) ne sont volontairement jamais
  // journalisées.
  equipe: [
    'update_fiche_poste', 'soumettre_compte_rendu', 'decision_compte_rendu',
    'creer_tache', 'modifier_tache', 'supprimer_tache',
    'creer_incident', 'modifier_incident', 'supprimer_incident',
    'ajouter_document_employe', 'supprimer_document_employe', 'import_fiches_paie',
    'ajouter_document_coach', 'supprimer_document_coach',
    'ajouter_note_suivi', 'supprimer_note_suivi',
  ],
  parametres: [
    'update_preferences', 'create_ip_autorisee', 'delete_ip_autorisee',
    'create_cours_type', 'update_cours_type',
    'create_checklist_modele', 'update_checklist_modele', 'delete_checklist_modele',
  ],
};

// GET /api/app-users/audit — historique (manager), paginé + filtres/tri
// Params : limit, offset, categorie, user_id, from (YYYY-MM-DD), to (YYYY-MM-DD), order (asc|desc)
// Déclarée avant /:id : sinon "/audit" serait capturé par :id="audit" (Express matche
// les routes dans l'ordre d'enregistrement).
router.get('/audit', requireManager, (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const order  = req.query.order === 'asc' ? 'ASC' : 'DESC';

  const where = [];
  const params = [];
  if (req.query.categorie && CATEGORIES[req.query.categorie]) {
    const actions = CATEGORIES[req.query.categorie];
    where.push(`a.action IN (${actions.map(() => '?').join(',')})`);
    params.push(...actions);
  }
  if (req.query.user_id) { where.push('a.user_id = ?');           params.push(Number(req.query.user_id)); }
  if (req.query.from)    { where.push('date(a.created_at) >= ?'); params.push(req.query.from); }
  if (req.query.to)      { where.push('date(a.created_at) <= ?'); params.push(req.query.to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.get(`SELECT COUNT(*) AS n FROM audit_log a ${whereSql}`, params).n;

  // Jointures sur seances/cours_types (update_seance) et demandes_conges
  // (decision_conge) — sans effet sur les autres lignes puisque la condition
  // sur a.entity empêche tout faux match (entity_id n'a pas le même sens
  // d'une action à l'autre dans cette table).
  const logs = db.all(`
    SELECT a.*, u.prenom || ' ' || u.nom AS user_nom,
           ct.nom AS cours_nom, s.date AS seance_date, s.horaire AS seance_horaire,
           cu.prenom || ' ' || cu.nom AS conge_demandeur
    FROM audit_log a
    LEFT JOIN app_users u        ON u.id = a.user_id
    LEFT JOIN seances s          ON a.entity = 'seances' AND s.id = a.entity_id
    LEFT JOIN cours_types ct     ON ct.id = s.cours_type_id
    LEFT JOIN demandes_conges dc ON a.entity = 'demandes_conges' AND dc.id = a.entity_id
    LEFT JOIN app_users cu       ON cu.id = dc.user_id
    ${whereSql}
    ORDER BY a.created_at ${order}
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  res.json({ rows: logs, total });
});

// GET /api/app-users/:id — fiche d'un salarié (le manager voit tout le monde, un
// utilisateur simple ne voit que sa propre fiche).
router.get('/:id', requireAuth, (req, res) => {
  const isManager = req.user.role === 'manager';
  const isSelf = req.user.id === Number(req.params.id);
  if (!isManager && !isSelf) return res.status(403).json({ error: 'Accès refusé' });
  const user = db.get(`SELECT ${CHAMPS_USER}, created_at FROM app_users WHERE id = ? AND supprime = 0`, [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

function cpDetail(id) {
  const user = db.get('SELECT id, date_debut_contrat, cp_ajuste FROM app_users WHERE id = ?', [id]);
  if (!user) return null;
  const pris = prisDepuisContrat(id, user.date_debut_contrat);
  const taux = parseFloat(getPreference('conges_taux_mensuel'));
  return { date_debut_contrat: user.date_debut_contrat, ...soldeCp(user.date_debut_contrat, user.cp_ajuste, pris, taux) };
}

// GET /api/app-users/:id/cp — détail du cumul de CP (manager, ou le salarié pour lui-même)
router.get('/:id/cp', requireAuth, (req, res) => {
  const isManager = req.user.role === 'manager';
  const isSelf = req.user.id === Number(req.params.id);
  if (!isManager && !isSelf) return res.status(403).json({ error: 'Accès refusé' });
  const detail = cpDetail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(detail);
});

// PATCH /api/app-users/:id/cp-ajuste — ajustement manuel du cumul de CP (+1/-1, manager)
router.patch('/:id/cp-ajuste', requireManager, (req, res) => {
  const user = db.get('SELECT id, prenom, nom, cp_ajuste FROM app_users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const delta = Number(req.body.delta) || 0;
  const newVal = Math.round(((user.cp_ajuste || 0) + delta) * 100) / 100;
  db.run('UPDATE app_users SET cp_ajuste = ? WHERE id = ?', [newVal, user.id]);
  if (delta) {
    logAudit({ userId: req.user.id, action: 'cp_ajuste', entity: 'app_users', entityId: user.id,
      details: `${user.prenom} ${user.nom || ''}`.trim() + ` — CP ajustés : ${delta > 0 ? '+' : ''}${delta}` });
  }
  res.json(cpDetail(req.params.id));
});

// POST /api/app-users — créer un profil (manager)
router.post('/', requireManager, (req, res) => {
  const { prenom, nom, email, role, date_debut_contrat } = req.body;
  if (!prenom) return res.status(400).json({ error: 'Le prénom est requis' });
  const heures = lireHeuresContrat(req.body.heures_contrat_semaine);
  if (heures.erreur) return res.status(400).json({ error: heures.erreur });
  const coach = lireCoachId(req.body.coach_id);
  if (coach.erreur) return res.status(coach.statut || 400).json({ error: coach.erreur });
  try {
    const result = db.run(
      'INSERT INTO app_users (prenom, nom, email, role, date_debut_contrat, heures_contrat_semaine, coach_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [prenom.trim(), (nom || '').trim(), email ? email.trim().toLowerCase() : null, role === 'manager' ? 'manager' : 'user', date_debut_contrat || null, heures.valeur ?? null, coach.valeur ?? null]
    );
    const user = db.get(`SELECT ${CHAMPS_USER} FROM app_users WHERE id = ?`, [result.lastInsertRowid]);
    db.run('INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create_user', 'app_users', user.id, `${user.prenom} ${user.nom}`]);
    res.status(201).json(user);
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email déjà utilisé' });
    throw e;
  }
});

// PUT /api/app-users/:id — modifier (manager ou soi-même)
router.put('/:id', requireAuth, (req, res) => {
  const isManager = req.user.role === 'manager';
  const isSelf    = req.user.id === Number(req.params.id);
  if (!isManager && !isSelf) return res.status(403).json({ error: 'Accès refusé' });
  if (!isManager && !isPrivileged(req)) {
    return res.status(403).json({ error: "Modification non autorisée depuis cet accès. Connecte-toi depuis la salle (IP autorisée) ou avec un compte manager." });
  }

  const { prenom, nom, email, role, actif, date_debut_contrat } = req.body;
  const user = db.get('SELECT * FROM app_users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const newRole = isManager && role ? (role === 'manager' ? 'manager' : 'user') : user.role;
  const newActif = isManager && actif !== undefined ? (actif ? 1 : 0) : user.actif;
  const newDateDebut = isManager && date_debut_contrat !== undefined ? (date_debut_contrat || null) : user.date_debut_contrat;

  const newEmail = email !== undefined ? (email ? email.trim().toLowerCase() : null) : user.email;

  // Les heures de contrat ne se modifient que par un manager (comme la date de contrat).
  const heures = isManager ? lireHeuresContrat(req.body.heures_contrat_semaine) : { valeur: undefined };
  if (heures.erreur) return res.status(400).json({ error: heures.erreur });
  const newHeures = heures.valeur !== undefined ? heures.valeur : user.heures_contrat_semaine;

  // La fiche coach reliée au profil non plus : seul un manager la change.
  const coach = isManager ? lireCoachId(req.body.coach_id, user.id) : { valeur: undefined };
  if (coach.erreur) return res.status(coach.statut || 400).json({ error: coach.erreur });
  const newCoachId = coach.valeur !== undefined ? coach.valeur : user.coach_id;

  const newPrenom = (prenom || user.prenom).trim();
  const newNom = (nom !== undefined ? nom : user.nom).trim();

  db.run(
    'UPDATE app_users SET prenom=?, nom=?, email=?, role=?, actif=?, date_debut_contrat=?, heures_contrat_semaine=?, coach_id=? WHERE id=?',
    [newPrenom, newNom, newEmail, newRole, newActif, newDateDebut, newHeures, newCoachId, req.params.id]
  );
  if (!newActif) db.run('DELETE FROM sessions WHERE user_id = ?', [req.params.id]);

  // Résumé de ce qui a réellement changé — pas de ligne d'historique si rien n'a bougé
  // (ex. un salarié qui rouvre puis renvoie sa propre fiche sans rien modifier).
  const changements = [];
  if (newRole !== user.role) changements.push(`Rôle → ${newRole === 'manager' ? 'Manager' : 'Utilisateur'}`);
  if (newActif !== user.actif) changements.push(newActif ? 'Réactivé' : 'Désactivé');
  if (newDateDebut !== user.date_debut_contrat) changements.push(`Date de contrat → ${newDateDebut || '—'}`);
  if (newEmail !== user.email) changements.push('Email modifié');
  if (newHeures !== user.heures_contrat_semaine) changements.push(`Heures de contrat → ${newHeures != null ? newHeures + 'h/semaine' : 'non suivi'}`);
  if (newCoachId !== user.coach_id) {
    const coach = newCoachId ? db.get('SELECT prenom, nom FROM coaches WHERE id = ?', [newCoachId]) : null;
    changements.push(newCoachId ? `Fiche coach reliée (${coach ? `${coach.prenom} ${coach.nom || ''}`.trim() : `#${newCoachId}`})` : 'Fiche coach déliée');
  }
  if (newPrenom !== user.prenom || newNom !== user.nom) changements.push(`Nom → ${newPrenom} ${newNom}`.trim());
  if (changements.length) {
    logAudit({ userId: req.user.id, action: 'update_user', entity: 'app_users', entityId: Number(req.params.id),
      details: `${user.prenom} ${user.nom || ''}`.trim() + ` — ${changements.join(' · ')}` });
  }

  res.json(db.get(`SELECT ${CHAMPS_USER} FROM app_users WHERE id = ?`, [req.params.id]));
});

// DELETE /api/app-users/:id — suppression définitive (soft : la ligne reste en DB
// pour que le planning historique affiche toujours le nom). Manager seulement.
router.delete('/:id', requireManager, (req, res) => {
  const user = db.get('SELECT id, prenom, nom FROM app_users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  db.run('UPDATE app_users SET supprime = 1, actif = 0 WHERE id = ?', [req.params.id]);
  db.run('DELETE FROM sessions WHERE user_id = ?', [req.params.id]);
  db.run('INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, 'delete_user', 'app_users', user.id, `${user.prenom} ${user.nom}`]);
  res.json({ ok: true });
});

module.exports = router;
