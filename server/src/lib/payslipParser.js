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
// Retourne { groupes: [{ employeId, employeNom, periode, pageDebut, pageFin, extrait }],
//            pagesOrphelines: [{ page, extrait }] } — pageDebut/pageFin en 1-indexé
// (pratique pour l'affichage et pour pdf-lib qui attend du 0-indexé — la conversion
// se fait à l'usage).
async function analyserFichesDePaie(buffer, employes) {
  const parser = new PDFParse({ data: buffer });
  let result;
  try {
    result = await parser.getText();
  } finally {
    await parser.destroy();
  }

  const groupes = [];
  const pagesOrphelines = [];
  let groupeCourant = null;

  for (const page of result.pages) {
    const emp = detecterEmploye(page.text, employes);
    const periode = detecterPeriode(page.text);
    const extrait = page.text.replace(/\s+/g, ' ').trim().slice(0, 140);

    if (emp) {
      if (groupeCourant) groupes.push(groupeCourant);
      groupeCourant = {
        employeId: emp.id,
        employeNom: `${emp.prenom} ${emp.nom}`,
        periode,
        pageDebut: page.num,
        pageFin: page.num,
        extrait,
      };
    } else if (groupeCourant) {
      // Page sans nom détecté juste après une page reconnue : probablement une
      // annexe/suite de la même fiche.
      groupeCourant.pageFin = page.num;
    } else {
      pagesOrphelines.push({ page: page.num, extrait });
    }
  }
  if (groupeCourant) groupes.push(groupeCourant);

  return { totalPages: result.total, groupes, pagesOrphelines };
}

module.exports = { analyserFichesDePaie, detecterEmploye, detecterPeriode };
