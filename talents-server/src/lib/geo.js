// Géocodage via l'API Adresse du gouvernement français (Base Adresse Nationale) —
// gratuite, sans clé, bien adaptée au contexte France/Île-de-France. Aucune
// capacité de géocodage n'existait ailleurs dans le repo avant Flyder Talents.
//
// `codePostal` est passé en paramètre dédié (filtre strict côté API), jamais
// mélangé au texte libre de `voieEtVille` : sans ça, l'API renvoie le meilleur
// match texte n'importe où en France dès que la voie exacte n'existe pas dans
// la commune donnée ("Avenue du Général Leclerc" existe dans des dizaines de
// villes) — un géocodage sans ce filtre a déjà atterri près de Nancy pour une
// adresse à Draveil. Depuis que ville/code postal viennent d'une commune
// choisie via autocomplétion (jamais de saisie libre), ce paramètre est
// toujours fiable.
async function geocodeAdresse(voieEtVille, codePostal) {
  if (!voieEtVille || !voieEtVille.trim()) return null;
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(voieEtVille.trim())}${codePostal ? `&postcode=${encodeURIComponent(codePostal)}` : ''}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features && data.features[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng };
  } catch (_) {
    // Une adresse introuvable ou l'API indisponible ne doit jamais bloquer
    // l'enregistrement du profil — juste laisser lat/lng vides.
    return null;
  }
}

// Distance à vol d'oiseau en km. Suffisant à l'échelle de quelques centaines de
// profils — pas besoin d'extension géospatiale SQLite pour ça.
function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null)) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

module.exports = { geocodeAdresse, haversineKm };
