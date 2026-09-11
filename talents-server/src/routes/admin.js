const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db/database');

// Protection minimale : une seule clé partagée (ADMIN_KEY, variable d'env par
// service), pas de système de comptes — cette interface n'a qu'un seul
// utilisateur (l'éditeur de Flyder Talents), un vrai système d'auth serait
// disproportionné. La comparaison en temps constant évite qu'un attaquant
// devine la clé caractère par caractère via le temps de réponse.
function clesEgales(fournie, attendue) {
  const a = Buffer.from(String(fournie || ''));
  const b = Buffer.from(String(attendue));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  const cle = process.env.ADMIN_KEY;
  if (!cle) return res.status(503).json({ error: 'ADMIN_KEY non configurée côté serveur' });
  const auth = req.headers.authorization;
  const fournie = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!clesEgales(fournie, cle)) return res.status(401).json({ error: 'Clé invalide' });
  next();
}

// POST /api/admin/login — ne renvoie rien de plus qu'une confirmation : le
// client réutilise ensuite cette même clé comme Bearer token sur chaque appel
// (pas de session dédiée, la clé EST le justificatif).
router.post('/login', (req, res) => {
  const cle = process.env.ADMIN_KEY;
  if (!cle) return res.status(503).json({ error: 'ADMIN_KEY non configurée côté serveur' });
  if (!clesEgales(req.body && req.body.key, cle)) return res.status(401).json({ error: 'Clé invalide' });
  res.json({ ok: true });
});

router.use(requireAdmin);

const sansMotDePasse = ({ password_hash, ...reste }) => reste;

// GET /api/admin/coaches — liste complète, sans filtre (contrairement à la
// recherche publique) : profils inactifs ou incomplets inclus, pour pouvoir
// tout voir et modérer.
router.get('/coaches', (req, res) => {
  res.json(db.all('SELECT * FROM coaches ORDER BY created_at DESC').map(sansMotDePasse));
});

router.get('/gyms', (req, res) => {
  res.json(db.all('SELECT * FROM gyms ORDER BY created_at DESC').map(sansMotDePasse));
});

// PATCH /api/admin/coaches/:id — bascule actif/inactif (modération), même
// mécanique que le contrôle en libre-service du titulaire du compte.
router.patch('/coaches/:id', (req, res) => {
  const coach = db.get('SELECT id FROM coaches WHERE id = ?', [Number(req.params.id)]);
  if (!coach) return res.status(404).json({ error: 'Coach introuvable' });
  if (req.body.actif !== undefined) {
    db.run("UPDATE coaches SET actif = ?, updated_at = datetime('now') WHERE id = ?", [req.body.actif ? 1 : 0, coach.id]);
  }
  res.json(sansMotDePasse(db.get('SELECT * FROM coaches WHERE id = ?', [coach.id])));
});

router.patch('/gyms/:id', (req, res) => {
  const gym = db.get('SELECT id FROM gyms WHERE id = ?', [Number(req.params.id)]);
  if (!gym) return res.status(404).json({ error: 'Salle introuvable' });
  if (req.body.actif !== undefined) {
    db.run("UPDATE gyms SET actif = ?, updated_at = datetime('now') WHERE id = ?", [req.body.actif ? 1 : 0, gym.id]);
  }
  res.json(sansMotDePasse(db.get('SELECT * FROM gyms WHERE id = ?', [gym.id])));
});

// DELETE — modération (spam, faux profils). Les contact_events historiques
// mentionnant cet id restent en base (simple log, pas de clé étrangère) : ils
// deviennent juste orphelins, sans conséquence fonctionnelle.
router.delete('/coaches/:id', (req, res) => {
  const coach = db.get('SELECT id FROM coaches WHERE id = ?', [Number(req.params.id)]);
  if (!coach) return res.status(404).json({ error: 'Coach introuvable' });
  db.run('DELETE FROM coaches WHERE id = ?', [coach.id]);
  res.json({ ok: true });
});

router.delete('/gyms/:id', (req, res) => {
  const gym = db.get('SELECT id FROM gyms WHERE id = ?', [Number(req.params.id)]);
  if (!gym) return res.status(404).json({ error: 'Salle introuvable' });
  db.run('DELETE FROM gyms WHERE id = ?', [gym.id]);
  res.json({ ok: true });
});

// GET /api/admin/contacts — qui a contacté qui, et quand. `contact_events` ne
// garde qu'un log (pas de fil de discussion, voir plan), enrichi ici avec les
// noms pour être lisible — la table brute n'a que des id/type. Un id qui ne
// correspond plus à personne (profil supprimé depuis) devient "supprimé".
router.get('/contacts', (req, res) => {
  const events = db.all('SELECT * FROM contact_events ORDER BY created_at DESC LIMIT 500');

  const coaches = new Map(db.all('SELECT id, prenom, nom FROM coaches').map((c) => [c.id, `${c.prenom} ${c.nom}`.trim()]));
  const gyms = new Map(db.all('SELECT id, nom FROM gyms').map((g) => [g.id, g.nom]));
  const nomDe = (type, id) => {
    const nom = (type === 'coach' ? coaches : gyms).get(id);
    return nom || `${type === 'coach' ? 'Coach' : 'Salle'} supprimé(e) #${id}`;
  };

  res.json(events.map((e) => ({
    id: e.id,
    created_at: e.created_at,
    initiateur_type: e.initiateur_type,
    initiateur_id: e.initiateur_id,
    initiateur_nom: nomDe(e.initiateur_type, e.initiateur_id),
    cible_type: e.cible_type,
    cible_id: e.cible_id,
    cible_nom: nomDe(e.cible_type, e.cible_id),
  })));
});

module.exports = router;
