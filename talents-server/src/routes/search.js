const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { haversineKm } = require('../lib/geo');
const { resolveActor } = require('../middleware/auth');

// Si quelqu'un est connecté, marque les profils qu'il a déjà contactés : le
// client peut alors ré-afficher les coordonnées sans reconsommer de quota.
function marquerDejaContactes(rows, req, cibleType) {
  const actor = resolveActor(req);
  if (!actor) return rows;
  const ids = new Set(
    db.all(
      'SELECT cible_id FROM contact_events WHERE initiateur_type = ? AND initiateur_id = ? AND cible_type = ?',
      [actor.type, actor.id, cibleType]
    ).map((r) => r.cible_id)
  );
  return rows.map((r) => ({ ...r, deja_contacte: ids.has(r.id) }));
}

// Journalise "ce profil est apparu dans les résultats d'une recherche" — une
// ligne par (viewer, cible) et par jour (voir profile_views dans
// db/database.js), pour donner à chaque salle/coach un ordre de grandeur de
// combien de monde voit son profil, sans exploser le compteur à chaque
// réglage de filtre dans la même session.
function enregistrerVues(rows, req, cibleType) {
  const actor = resolveActor(req);
  if (!actor) return;
  for (const r of rows) {
    if (actor.type === cibleType && actor.id === r.id) continue;
    const dejaVu = db.get(
      `SELECT 1 FROM profile_views WHERE viewer_type = ? AND viewer_id = ? AND cible_type = ? AND cible_id = ? AND date(created_at) = date('now') LIMIT 1`,
      [actor.type, actor.id, cibleType, r.id]
    );
    if (!dejaVu) {
      db.run('INSERT INTO profile_views (viewer_type, viewer_id, cible_type, cible_id) VALUES (?, ?, ?, ?)', [actor.type, actor.id, cibleType, r.id]);
    }
  }
}

// Aucune donnée sensible dans les SELECT ci-dessous : téléphone/email/contact_*
// ne sont jamais chargés pour la recherche publique — c'est la rédaction la
// plus sûre (ne jamais aller chercher ce qui ne doit pas fuiter), plutôt qu'un
// filtrage a posteriori sur un objet déjà complet. Même logique pour la voie
// exacte (`adresse`) : seule la `ville` est sélectionnée, jamais la rue/numéro.

function parseDisciplines(q) {
  return q ? String(q).split(',').map((s) => s.trim()).filter(Boolean) : [];
}

function appliquerDistance(rows, lat, lng, rayonKm) {
  const userLat = lat != null ? Number(lat) : null;
  const userLng = lng != null ? Number(lng) : null;
  if (userLat == null || userLng == null || Number.isNaN(userLat) || Number.isNaN(userLng)) return rows;

  let out = rows.map((r) => {
    const d = r.lat != null && r.lng != null ? haversineKm(userLat, userLng, r.lat, r.lng) : null;
    return { ...r, distance_km: d != null ? Math.round(d * 10) / 10 : null };
  });
  const rayon = rayonKm != null ? Number(rayonKm) : null;
  if (rayon != null && !Number.isNaN(rayon)) {
    out = out.filter((r) => r.distance_km != null && r.distance_km <= rayon);
  }
  out.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
  return out;
}

// GET /api/search/coaches?discipline=fitness,boxe&tarif_min=&tarif_max=&remplacements=1&lat=&lng=&rayon_km=
router.get('/coaches', (req, res) => {
  let rows = db.all(
    `SELECT id, nom, prenom, ville, lat, lng, disciplines, disciplines_autre_fitness, disciplines_autre_aqua, disciplines_preferees, tarif_horaire, bio, photo_url, disponible_remplacements
     FROM coaches WHERE profil_complet = 1 AND actif = 1`
  );

  const disciplines = parseDisciplines(req.query.discipline);
  if (disciplines.length) {
    rows = rows.filter((c) => disciplines.some((d) => (c.disciplines || '').split(',').includes(d)));
  }
  if (req.query.tarif_min) {
    const min = Number(req.query.tarif_min);
    rows = rows.filter((c) => c.tarif_horaire == null || c.tarif_horaire >= min);
  }
  if (req.query.tarif_max) {
    const max = Number(req.query.tarif_max);
    rows = rows.filter((c) => c.tarif_horaire == null || c.tarif_horaire <= max);
  }
  if (req.query.remplacements === '1') {
    rows = rows.filter((c) => !!c.disponible_remplacements);
  }

  enregistrerVues(rows, req, 'coach');
  res.json(marquerDejaContactes(appliquerDistance(rows, req.query.lat, req.query.lng, req.query.rayon_km), req, 'coach'));
});

// GET /api/search/coaches/:id — fiche publique d'un coach (mêmes champs que la
// recherche, jamais de coordonnées). Utilisée par l'app Flyder d'une salle pour
// pré-remplir une fiche coach locale à partir d'une "Réf. Talents".
router.get('/coaches/:id', (req, res) => {
  const coach = db.get(
    `SELECT id, nom, prenom, ville, disciplines, disciplines_autre_fitness, disciplines_autre_aqua, disciplines_preferees, tarif_horaire, bio, photo_url, disponible_remplacements
     FROM coaches WHERE id = ? AND profil_complet = 1 AND actif = 1`,
    [Number(req.params.id)]
  );
  if (!coach) return res.status(404).json({ error: 'Profil Talents introuvable' });
  res.json(coach);
});

// GET /api/search/gyms?discipline=fitness,boxe&lat=&lng=&rayon_km=
router.get('/gyms', (req, res) => {
  let rows = db.all(
    `SELECT id, nom, ville, lat, lng, disciplines_recherchees, disciplines_autre_fitness, disciplines_autre_aqua, disciplines_preferees, description, photo_url
     FROM gyms WHERE profil_complet = 1 AND actif = 1`
  );

  const disciplines = parseDisciplines(req.query.discipline);
  if (disciplines.length) {
    rows = rows.filter((g) => disciplines.some((d) => (g.disciplines_recherchees || '').split(',').includes(d)));
  }

  enregistrerVues(rows, req, 'gym');
  res.json(marquerDejaContactes(appliquerDistance(rows, req.query.lat, req.query.lng, req.query.rayon_km), req, 'gym'));
});

module.exports = router;
