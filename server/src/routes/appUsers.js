const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireAuth, requireManager } = require('../middleware/auth');
const { isPrivileged } = require('../middleware/ipAccess');
const { soldeCp, prisDepuisContrat } = require('../lib/cp');
const { getPreference } = require('../lib/preferences');

// GET /api/app-users — liste (manager seulement) — hors profils supprimés
router.get('/', requireManager, (req, res) => {
  const users = db.all('SELECT id, prenom, nom, email, role, actif, date_debut_contrat, created_at FROM app_users WHERE supprime = 0 ORDER BY prenom, nom');
  res.json(users);
});

// GET /api/app-users/audit — historique (manager), paginé + filtres/tri
// Params : limit, offset, action, user_id, from (YYYY-MM-DD), to (YYYY-MM-DD), order (asc|desc)
// Déclarée avant /:id : sinon "/audit" serait capturé par :id="audit" (Express matche
// les routes dans l'ordre d'enregistrement).
router.get('/audit', requireManager, (req, res) => {
  const limit  = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const order  = req.query.order === 'asc' ? 'ASC' : 'DESC';

  const where = [];
  const params = [];
  if (req.query.action)  { where.push('a.action = ?');           params.push(req.query.action); }
  if (req.query.user_id) { where.push('a.user_id = ?');          params.push(Number(req.query.user_id)); }
  if (req.query.from)    { where.push('date(a.created_at) >= ?'); params.push(req.query.from); }
  if (req.query.to)      { where.push('date(a.created_at) <= ?'); params.push(req.query.to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const logs = db.all(`
    SELECT a.*, u.prenom || ' ' || u.nom AS user_nom
    FROM audit_log a
    LEFT JOIN app_users u ON u.id = a.user_id
    ${whereSql}
    ORDER BY a.created_at ${order}
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  res.json(logs);
});

// GET /api/app-users/:id — fiche d'un salarié (le manager voit tout le monde, un
// utilisateur simple ne voit que sa propre fiche).
router.get('/:id', requireAuth, (req, res) => {
  const isManager = req.user.role === 'manager';
  const isSelf = req.user.id === Number(req.params.id);
  if (!isManager && !isSelf) return res.status(403).json({ error: 'Accès refusé' });
  const user = db.get('SELECT id, prenom, nom, email, role, actif, date_debut_contrat, created_at FROM app_users WHERE id = ? AND supprime = 0', [req.params.id]);
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
  const user = db.get('SELECT id, cp_ajuste FROM app_users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const delta = Number(req.body.delta) || 0;
  const newVal = Math.round(((user.cp_ajuste || 0) + delta) * 100) / 100;
  db.run('UPDATE app_users SET cp_ajuste = ? WHERE id = ?', [newVal, user.id]);
  res.json(cpDetail(req.params.id));
});

// POST /api/app-users — créer un profil (manager)
router.post('/', requireManager, (req, res) => {
  const { prenom, nom, email, role, date_debut_contrat } = req.body;
  if (!prenom) return res.status(400).json({ error: 'Le prénom est requis' });
  try {
    const result = db.run(
      'INSERT INTO app_users (prenom, nom, email, role, date_debut_contrat) VALUES (?, ?, ?, ?, ?)',
      [prenom.trim(), (nom || '').trim(), email ? email.trim().toLowerCase() : null, role === 'manager' ? 'manager' : 'user', date_debut_contrat || null]
    );
    const user = db.get('SELECT id, prenom, nom, email, role, actif, date_debut_contrat FROM app_users WHERE id = ?', [result.lastInsertRowid]);
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

  db.run(
    'UPDATE app_users SET prenom=?, nom=?, email=?, role=?, actif=?, date_debut_contrat=? WHERE id=?',
    [
      (prenom || user.prenom).trim(),
      (nom !== undefined ? nom : user.nom).trim(),
      newEmail,
      newRole, newActif, newDateDebut,
      req.params.id
    ]
  );
  if (!newActif) db.run('DELETE FROM sessions WHERE user_id = ?', [req.params.id]);
  res.json(db.get('SELECT id, prenom, nom, email, role, actif, date_debut_contrat FROM app_users WHERE id = ?', [req.params.id]));
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
