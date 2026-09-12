// Logique de mise à jour partielle d'un profil coach/salle, partagée entre
// PUT /api/coach-auth/me, PUT /api/gym-auth/me (le titulaire modifie son
// propre profil) et PUT /api/admin/coaches|gyms/:id (l'admin modifie
// n'importe quel profil) — même règles, même géocodage, un seul endroit à
// maintenir. Chaque fonction retourne soit { error, status }, soit { profile }.
const db = require('../db/database');
const { geocodeAdresse } = require('./geo');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_POSTAL_RE = /^\d{5}$/;
// Borne les champs libres : évite qu'un profil serve de dépotoir (spam, abus).
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

const COACH_FIELDS =
  'id, email, nom, prenom, adresse, code_postal, ville, lat, lng, disciplines, tarif_horaire, bio, photo_url, telephone, email_public, profil_complet, actif, disponible_remplacements';
const GYM_FIELDS =
  'id, email, nom, adresse, code_postal, ville, lat, lng, disciplines_recherchees, description, photo_url, contact_nom, contact_email, contact_telephone, profil_complet, actif';

async function updateCoachProfile(coachId, b) {
  const current = db.get('SELECT * FROM coaches WHERE id = ?', [coachId]);
  if (!current) return { error: 'Coach introuvable', status: 404 };

  const nom = b.nom !== undefined ? clean(b.nom, 80) : current.nom;
  const prenom = b.prenom !== undefined ? clean(b.prenom, 80) : current.prenom;
  const bio = b.bio !== undefined ? clean(b.bio, 2000) : current.bio;
  const telephone = b.telephone !== undefined ? clean(b.telephone, 30) : current.telephone;
  if (!nom || !prenom) return { error: 'Nom et prénom requis', status: 400 };
  const tarifHoraire = b.tarif_horaire !== undefined ? (b.tarif_horaire === null || b.tarif_horaire === '' ? null : Number(b.tarif_horaire)) : current.tarif_horaire;
  const emailPublic = b.email_public !== undefined ? (b.email_public ? 1 : 0) : current.email_public;
  const actif = b.actif !== undefined ? (b.actif ? 1 : 0) : current.actif;
  const disponibleRemplacements = b.disponible_remplacements !== undefined ? (b.disponible_remplacements ? 1 : 0) : current.disponible_remplacements;
  const disciplines = b.disciplines !== undefined
    ? (Array.isArray(b.disciplines) ? b.disciplines.join(',') : String(b.disciplines))
    : current.disciplines;

  // La ville vient obligatoirement d'une commune réelle choisie côté client
  // (autocomplétion Base Adresse Nationale) — jamais de saisie libre, pour
  // qu'il soit impossible d'enregistrer "aulnay" à la place d'"Aulnay-sous-
  // Bois" et de fausser silencieusement le tri par distance.
  if (b.code_postal !== undefined && b.code_postal && !CODE_POSTAL_RE.test(String(b.code_postal).trim())) {
    return { error: 'Code postal invalide (5 chiffres)', status: 400 };
  }

  let adresse = current.adresse, codePostal = current.code_postal, ville = current.ville, lat = current.lat, lng = current.lng;
  let adresseChangee = false;
  if (b.adresse !== undefined) { const v = clean(b.adresse, 200); if (v !== (current.adresse || '')) { adresse = v; adresseChangee = true; } }
  if (b.code_postal !== undefined) { const v = clean(b.code_postal, 5); if (v !== (current.code_postal || '')) { codePostal = v; adresseChangee = true; } }
  if (b.ville !== undefined) { const v = clean(b.ville, 100); if (v !== (current.ville || '')) { ville = v; adresseChangee = true; } }

  if (adresseChangee) {
    const geo = (adresse && ville) ? await geocodeAdresse(`${adresse} ${ville}`, codePostal) : null;
    lat = geo ? geo.lat : null;
    lng = geo ? geo.lng : null;
  }

  const profilComplet = adresse && codePostal && ville && lat != null && disciplines ? 1 : 0;

  db.run(
    `UPDATE coaches SET nom=?, prenom=?, adresse=?, code_postal=?, ville=?, lat=?, lng=?, disciplines=?, tarif_horaire=?, bio=?, telephone=?, email_public=?, actif=?, disponible_remplacements=?, profil_complet=?, updated_at=datetime('now') WHERE id=?`,
    [nom, prenom, adresse, codePostal, ville, lat, lng, disciplines, tarifHoraire, bio, telephone, emailPublic, actif, disponibleRemplacements, profilComplet, coachId]
  );

  return { profile: db.get(`SELECT ${COACH_FIELDS} FROM coaches WHERE id = ?`, [coachId]) };
}

async function updateGymProfile(gymId, b) {
  const current = db.get('SELECT * FROM gyms WHERE id = ?', [gymId]);
  if (!current) return { error: 'Salle introuvable', status: 404 };

  const nom = b.nom !== undefined ? clean(b.nom, 120) : current.nom;
  const description = b.description !== undefined ? clean(b.description, 3000) : current.description;
  const contactNom = b.contact_nom !== undefined ? clean(b.contact_nom, 80) : current.contact_nom;
  const contactEmail = b.contact_email !== undefined ? clean(b.contact_email, 120) : current.contact_email;
  const contactTelephone = b.contact_telephone !== undefined ? clean(b.contact_telephone, 30) : current.contact_telephone;
  if (!nom) return { error: 'Nom de la salle requis', status: 400 };
  if (contactEmail && !EMAIL_RE.test(contactEmail)) return { error: 'Email de contact invalide', status: 400 };
  const actif = b.actif !== undefined ? (b.actif ? 1 : 0) : current.actif;
  const disciplinesRecherchees = b.disciplines_recherchees !== undefined
    ? (Array.isArray(b.disciplines_recherchees) ? b.disciplines_recherchees.join(',') : String(b.disciplines_recherchees))
    : current.disciplines_recherchees;

  if (b.code_postal !== undefined && b.code_postal && !CODE_POSTAL_RE.test(String(b.code_postal).trim())) {
    return { error: 'Code postal invalide (5 chiffres)', status: 400 };
  }

  let adresse = current.adresse, codePostal = current.code_postal, ville = current.ville, lat = current.lat, lng = current.lng;
  let adresseChangee = false;
  if (b.adresse !== undefined) { const v = clean(b.adresse, 200); if (v !== (current.adresse || '')) { adresse = v; adresseChangee = true; } }
  if (b.code_postal !== undefined) { const v = clean(b.code_postal, 5); if (v !== (current.code_postal || '')) { codePostal = v; adresseChangee = true; } }
  if (b.ville !== undefined) { const v = clean(b.ville, 100); if (v !== (current.ville || '')) { ville = v; adresseChangee = true; } }

  if (adresseChangee) {
    const geo = (adresse && ville) ? await geocodeAdresse(`${adresse} ${ville}`, codePostal) : null;
    lat = geo ? geo.lat : null;
    lng = geo ? geo.lng : null;
  }

  const profilComplet = adresse && codePostal && ville && lat != null && disciplinesRecherchees ? 1 : 0;

  db.run(
    `UPDATE gyms SET nom=?, adresse=?, code_postal=?, ville=?, lat=?, lng=?, disciplines_recherchees=?, description=?, contact_nom=?, contact_email=?, contact_telephone=?, actif=?, profil_complet=?, updated_at=datetime('now') WHERE id=?`,
    [nom, adresse, codePostal, ville, lat, lng, disciplinesRecherchees, description, contactNom, contactEmail, contactTelephone, actif, profilComplet, gymId]
  );

  return { profile: db.get(`SELECT ${GYM_FIELDS} FROM gyms WHERE id = ?`, [gymId]) };
}

module.exports = { updateCoachProfile, updateGymProfile, COACH_FIELDS, GYM_FIELDS, EMAIL_RE };
