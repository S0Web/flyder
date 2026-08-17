// Analyse d'un PDF contenant les fiches de paie de tous les salariés en une seule
// fois : extrait le texte de chaque page, essaie d'y reconnaître un nom de salarié
// (parmi les comptes actifs) et une période (mois/année), puis regroupe les pages
// consécutives appartenant à la même fiche (une fiche de paie fait parfois plusieurs
// pages — annexe, détail...). Pas d'IA : juste extraction de texte + reconnaissance
// de motifs. Le résultat est une PROPOSITION que le manager relit et corrige avant
// import définitif (voir routes/employeDocuments.js) — la précision du matching n'a
// donc pas besoin d'être parfaite.

const { PDFParse } = require('pdf-parse');

const MOIS = {
  janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05',
  juin: '06', juillet: '07', aout: '08', août: '08', septembre: '09',
  octobre: '10', novembre: '11', decembre: '12', décembre: '12',
};

function normalise(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cherche le nom d'un employé (prénom+nom ou nom+prénom, insensible aux accents/casse)
// dans le texte d'une page. Retourne l'employé le plus long/spécifique trouvé (évite
// qu'un prénom commun comme "Léa" matche par erreur avant un nom complet plus précis).
function detecterEmploye(texte, employes) {
  const norm = normalise(texte);
  let meilleur = null, meilleurLongueur = 0;
  for (const emp of employes) {
    const prenom = normalise(emp.prenom), nom = normalise(emp.nom);
    if (!prenom) continue;
    const variantes = nom ? [`${prenom} ${nom}`, `${nom} ${prenom}`] : [prenom];
    for (const v of variantes) {
      if (v.length > meilleurLongueur && norm.includes(v)) {
        meilleur = emp;
        meilleurLongueur = v.length;
      }
    }
  }
  return meilleur;
}

// Cherche le matricule (identifiant salarié imprimé sur CHAQUE page d'un bulletin,
// y compris ses pages de suite) — sert à délimiter fiablement les fiches, indépendamment
// de la reconnaissance du nom (qui elle ne dit rien sur les frontières entre documents).
function detecterMatricule(texte) {
  const m = texte.match(/Matricule[\s\S]{0,200}?\b(\d{5,7})\b/);
  return m ? m[1] : null;
}

// Cherche une période "mois-année" dans le texte : soit "du JJ/MM/AAAA au JJ/MM/AAAA"
// (on garde le mois de début), soit un nom de mois français suivi d'une année.
function detecterPeriode(texte) {
  const matchPlage = texte.match(/(\d{2})\/(\d{2})\/(\d{4})\s*au\s*\d{2}\/\d{2}\/\d{4}/i);
  if (matchPlage) return `${matchPlage[3]}-${matchPlage[2]}`;

  const norm = normalise(texte);
  for (const [nomMois, numero] of Object.entries(MOIS)) {
    const re = new RegExp(`\\b${normalise(nomMois)}\\s+(\\d{4})\\b`);
    const m = norm.match(re);
    if (m) return `${m[1]}-${numero}`;
  }
  return null;
}

// employes : [{ id, prenom, nom }] — comptes actifs, candidats au matching.
// Retourne { totalPages, groupes: [{ employeId, employeNom, matricule, periode, pageDebut,
// pageFin, extrait }] } — les frontières entre fiches sont déterminées par le matricule
// (imprimé sur chaque page, y compris les pages de suite), pas par la reconnaissance du
// nom : celle-ci ne sert qu'à pré-remplir employeId (peut rester null si le salarié n'a
// pas de profil connu — le manager choisit alors manuellement dans l'interface de revue).
// pageDebut/pageFin en 1-indexé (pratique pour l'affichage et pour pdf-lib qui attend du
// 0-indexé — la conversion se fait à l'usage).
async function analyserFichesDePaie(buffer, employes) {
  const parser = new PDFParse({ data: buffer });
  let result;
  try {
    result = await parser.getText();
  } finally {
    await parser.destroy();
  }

  const groupes = [];
  let groupeCourant = null;

  for (const page of result.pages) {
    const matricule = detecterMatricule(page.text);
    const emp = detecterEmploye(page.text, employes);
    const periode = detecterPeriode(page.text);
    const extrait = page.text.replace(/\s+/g, ' ').trim().slice(0, 140);

    // Une page de suite d'un même bulletin répète systématiquement l'en-tête (matricule,
    // identité...) — un nom reconnu à nouveau ne signale donc PAS un nouveau document tant
    // que le matricule n'a pas changé. Sans matricule détectable (page d'annexe atypique),
    // on suppose par défaut la suite de la fiche en cours.
    const suite = groupeCourant && (
      (matricule && matricule === groupeCourant.matricule) ||
      (!matricule && !emp)
    );

    if (suite) {
      groupeCourant.pageFin = page.num;
      // Le nom n'est parfois lisible que sur la 1ère page (photo de l'adresse coupée etc.) ;
      // on complète l'identification si une page suivante de la même fiche l'apporte.
      if (!groupeCourant.employeId && emp) {
        groupeCourant.employeId = emp.id;
        groupeCourant.employeNom = `${emp.prenom} ${emp.nom}`;
      }
    } else {
      if (groupeCourant) groupes.push(groupeCourant);
      groupeCourant = {
        employeId: emp?.id ?? null,
        employeNom: emp ? `${emp.prenom} ${emp.nom}` : null,
        matricule,
        periode,
        pageDebut: page.num,
        pageFin: page.num,
        extrait,
      };
    }
  }
  if (groupeCourant) groupes.push(groupeCourant);

  return { totalPages: result.total, groupes };
}

module.exports = { analyserFichesDePaie, detecterEmploye, detecterPeriode, detecterMatricule };
