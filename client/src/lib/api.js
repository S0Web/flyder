import { getJetonDeverrouillage, oublierDeverrouillage } from './deverrouillage';

const BASE = '/api';

function getToken() {
  return localStorage.getItem('fm_token');
}

// Erreur « documents verrouillés » (423) : le jeton de déverrouillage a expiré
// ou n'existe pas encore — l'interface affiche alors l'écran de saisie du code.
export class VerrouilleError extends Error {}

async function req(path, options = {}) {
  const token = getToken();
  const { headers: extraHeaders, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    ...rest,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 423) {
      oublierDeverrouillage();
      throw new VerrouilleError(err.error);
    }
    if (res.status === 401 && path !== '/auth/select') {
      localStorage.removeItem('fm_token');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    if (res.status === 402 && err.error === 'abonnement_bloque' && window.location.pathname !== '/abonnement-bloque') {
      window.location.assign('/abonnement-bloque');
    }
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// Télécharge un fichier depuis une route protégée par token (les documents salariés/coachs
// ne sont pas servis en statique comme les images Formation — il faut passer l'Authorization).
async function telechargerFichierProtege(path, nomFichier, extraHeaders = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 423) {
      oublierDeverrouillage();
      throw new VerrouilleError(err.error);
    }
    throw new Error(err.error || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function qs(params) {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  return s ? `?${s}` : '';
}

function enteteDeverrouillage() {
  const jeton = getJetonDeverrouillage();
  return jeton ? { 'X-Unlock-Token': jeton } : {};
}

export const api = {
  // Config publique (nom de la salle, etc.)
  getConfig: () => req('/config'),

  // Auth
  getProfiles:    () => req('/auth/profiles'),
  createProfile:  (data) => req('/auth/profiles', { method: 'POST', body: JSON.stringify(data) }),
  selectProfile:  (userId, code) => req('/auth/select', { method: 'POST', body: JSON.stringify({ user_id: userId, code }) }),
  setCode:        (userId, code) => req('/auth/set-code', { method: 'POST', body: JSON.stringify({ user_id: userId, code }) }),
  forgetCode:     (userId) => req('/auth/forget-code', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  devAccess:      (key) => req('/auth/dev-access', { method: 'POST', body: JSON.stringify({ key }) }),
  logout:   () => req('/auth/logout', { method: 'POST' }),
  me:       () => req('/auth/me'),

  // Utilisateurs
  getAppUsers:    () => req('/app-users'),
  getAppUser:     (id) => req(`/app-users/${id}`),
  createAppUser:  (data) => req('/app-users', { method: 'POST', body: JSON.stringify(data) }),
  updateAppUser:  (id, data) => req(`/app-users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppUser:  (id) => req(`/app-users/${id}`, { method: 'DELETE' }),
  getCpDetail:    (id) => req(`/app-users/${id}/cp`),
  adjustCp:       (id, delta) => req(`/app-users/${id}/cp-ajuste`, { method: 'PATCH', body: JSON.stringify({ delta }) }),
  getAuditLog:    (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return req(`/app-users/audit${qs ? `?${qs}` : ''}`);
  },

  // Déverrouillage des documents RH (ressaisie du code)
  deverrouiller: (code) => req('/auth/deverrouiller', { method: 'POST', body: JSON.stringify({ code }) }),

  // Tâches
  getIncidents:   (params = {}) => req(`/incidents${qs(params)}`),
  createIncident: (data) => req('/incidents', { method: 'POST', body: JSON.stringify(data) }),
  patchIncident:  (id, data) => req(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteIncident: (id) => req(`/incidents/${id}`, { method: 'DELETE' }),
  getChecklists:   () => req('/checklists'),
  createChecklist: (data) => req('/checklists', { method: 'POST', body: JSON.stringify(data) }),
  updateChecklist: (id, data) => req(`/checklists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChecklist: (id) => req(`/checklists/${id}`, { method: 'DELETE' }),
  getTaches:    (params = {}) => req(`/taches${qs(params)}`),
  createTache:  (data) => req('/taches', { method: 'POST', body: JSON.stringify(data) }),
  patchTache:   (id, data) => req(`/taches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTache:  (id) => req(`/taches/${id}`, { method: 'DELETE' }),
  getTacheCommentaires: (id) => req(`/taches/${id}/commentaires`),
  addTacheCommentaire:  (id, contenu) => req(`/taches/${id}/commentaires`, { method: 'POST', body: JSON.stringify({ contenu }) }),

  // Équipe
  getVueEnsemble:   () => req('/equipe/vue-ensemble'),
  getMaJournee:     () => req('/equipe/ma-journee'),
  getMembres:       () => req('/equipe/membres'),
  getMembreResume:  (id) => req(`/equipe/membres/${id}/resume`),
  getEquipePastille: () => req('/equipe/pastille'),
  getFichePoste:    (userId) => req(`/equipe/fiches-poste/${userId}`),
  saveFichePoste:   (userId, data) => req(`/equipe/fiches-poste/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
  getComptesRendus: (params = {}) => req(`/equipe/comptes-rendus${qs(params)}`),
  getMonCompteRendu: (date) => req(`/equipe/comptes-rendus/moi/${date}`),
  saveMonCompteRendu: (date, data) => req(`/equipe/comptes-rendus/moi/${date}`, { method: 'PUT', body: JSON.stringify(data) }),
  marquerProbleme: (id, data) => req(`/equipe/comptes-rendus/${id}/probleme`, { method: 'POST', body: JSON.stringify(data) }),
  deciderCompteRendu: (id, decision, retour) =>
    req(`/equipe/comptes-rendus/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, retour }) }),
  getNotesSuivi:   (membreId) => req(`/equipe/membres/${membreId}/notes-suivi`),
  addNoteSuivi:    (membreId, contenu) => req(`/equipe/membres/${membreId}/notes-suivi`, { method: 'POST', body: JSON.stringify({ contenu }) }),
  deleteNoteSuivi: (id) => req(`/equipe/notes-suivi/${id}`, { method: 'DELETE' }),
  getNotes:    () => req('/equipe/notes'),
  createNote:  (data) => req('/equipe/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote:  (id, data) => req(`/equipe/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote:  (id) => req(`/equipe/notes/${id}`, { method: 'DELETE' }),

  // Coaches
  getCoachesRecap: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return req(`/coaches/recap${qs ? `?${qs}` : ''}`);
  },
  getAnalytics: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return req(`/analytics${qs ? `?${qs}` : ''}`);
  },
  getTickets:      () => req('/tickets'),
  getTicket:       (id) => req(`/tickets/${id}`),
  getTicketsUnreadCount: () => req('/tickets/unread-count'),
  createTicket:    (message) => req('/tickets', { method: 'POST', body: JSON.stringify({ message }) }),
  replyTicket:     (id, corps) => req(`/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ corps }) }),
  setTicketStatut: (id, statut) => req(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ statut }) }),
  getChangelog:    () => req('/changelog'),
  markChangelogVu: (id) => req('/changelog/vu', { method: 'POST', body: JSON.stringify({ id }) }),
  getPreferences:    () => req('/preferences'),
  updatePreferences: (data) => req('/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
  getCoaches:      (tous = false) => req(`/coaches${tous ? '?tous=1' : ''}`),
  getCoachStats:   (id) => req(`/coaches/${id}/stats`),
  getCoachSeancesDetail: (id, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return req(`/coaches/${id}/seances-detail${qs ? `?${qs}` : ''}`);
  },
  getTalentsCoach: (id) => req(`/coaches/talents/${id}`),
  createCoach:     (data) => req('/coaches', { method: 'POST', body: JSON.stringify(data) }),
  updateCoach:     (id, data) => req(`/coaches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patchCoach:      (id, data) => req(`/coaches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  toggleCoach:     (id, actif) => req(`/coaches/${id}/actif`, { method: 'PATCH', body: JSON.stringify({ actif }) }),
  deleteCoach:     (id, definitif) => req(`/coaches/${id}${definitif ? '?definitif=1' : ''}`, { method: 'DELETE' }),

  // Cours types
  getCoursTypes: () => req('/cours-types'),
  createCoursType: (nom, categorie) => req('/cours-types', { method: 'POST', body: JSON.stringify({ nom, categorie }) }),
  patchCoursType: (id, data) => req(`/cours-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAlertesRemplissage: () => req('/seances/alertes-remplissage'),

  // Annuaire
  getAnnuaire:          () => req('/annuaire'),
  createAnnuaireContact: (data) => req('/annuaire', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnuaireContact: (id, data) => req(`/annuaire/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnuaireContact: (id) => req(`/annuaire/${id}`, { method: 'DELETE' }),

  // Séances
  getSeances:      (semaine) => req(`/seances${semaine ? `?semaine=${semaine}` : ''}`),
  createSeance:    (data) => req('/seances', { method: 'POST', body: JSON.stringify(data) }),
  patchSeance:     (id, data) => req(`/seances/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSeance:    (id) => req(`/seances/${id}`, { method: 'DELETE' }),
  dupliquerSemaine: (semaine_source, semaine_cible) =>
    req('/seances/dupliquer', { method: 'POST', body: JSON.stringify({ semaine_source, semaine_cible }) }),

  // Demandes de congé
  getDemandesConges:   (params = {}) => req(`/demandes-conges${qs(params)}`),
  createDemandeConge:  (data) => req('/demandes-conges', { method: 'POST', body: JSON.stringify(data) }),
  annulerDemandeConge: (id) => req(`/demandes-conges/${id}/annuler`, { method: 'POST' }),
  deciderDemandeConge: (id, data) => req(`/demandes-conges/${id}/decision`, { method: 'POST', body: JSON.stringify(data) }),

  // Créneaux personnel
  getPersonnelCreneaux:   (semaine) => req(`/personnel-creneaux?semaine=${semaine}`),
  getCpSummary:           () => req('/personnel-creneaux/cp-summary'),
  getPersonnelRecap:      (debut, fin) => req(`/personnel-creneaux/recap?debut=${debut}&fin=${fin}`),
  upsertPersonnelCreneau: (employeId, date, data) =>
    req(`/personnel-creneaux/${employeId}/${date}`, { method: 'PUT', body: JSON.stringify(data) }),
  dupliquerSemainePersonnel: (semaine_source, semaine_cible) =>
    req('/personnel-creneaux/dupliquer', { method: 'POST', body: JSON.stringify({ semaine_source, semaine_cible }) }),

  // Formation : catégories (niveau 1)
  getFormationCategories: () => req('/formation/categories'),
  getFormationCategorie:  (id) => req(`/formation/categories/${id}`),
  createFormationCategorie: (data) => req('/formation/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateFormationCategorie: (id, data) => req(`/formation/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFormationCategorie: (id) => req(`/formation/categories/${id}`, { method: 'DELETE' }),
  reorderFormationCategorie: (id, direction) => req(`/formation/categories/${id}/ordre`, { method: 'PATCH', body: JSON.stringify({ direction }) }),

  // Formation : articles (niveau 2, "sous-formations")
  getFormationArticles: (categorieId) => req(`/formation${categorieId ? `?categorie_id=${categorieId}` : ''}`),
  getFormationArticle:  (id) => req(`/formation/${id}`),
  createFormationArticle: (data) => req('/formation', { method: 'POST', body: JSON.stringify(data) }),
  updateFormationArticle: (id, data) => req(`/formation/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFormationArticle: (id) => req(`/formation/${id}`, { method: 'DELETE' }),
  reorderFormationArticle: (id, direction) => req(`/formation/${id}/ordre`, { method: 'PATCH', body: JSON.stringify({ direction }) }),
  uploadFormationImage: async (file) => {
    const token = getToken();
    const body = new FormData();
    body.append('image', file);
    const res = await fetch(`${BASE}/formation/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },

  // Documents salariés (fiches de paie, contrat, arrêt maladie, autre)
  getEmployeDocuments: (userId) => req(`/employe-documents/${userId}`, { headers: enteteDeverrouillage() }),
  uploadEmployeDocument: async (userId, file, type, periode) => {
    const token = getToken();
    const body = new FormData();
    body.append('fichier', file);
    body.append('type', type);
    if (periode) body.append('periode', periode);
    const res = await fetch(`${BASE}/employe-documents/${userId}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },
  deleteEmployeDocument: (id) => req(`/employe-documents/${id}`, { method: 'DELETE' }),
  downloadEmployeDocument: (id, nomFichier) =>
    telechargerFichierProtege(`/employe-documents/file/${id}`, nomFichier, enteteDeverrouillage()),

  // Import groupé des fiches de paie
  analyserFichesDePaie: async (file) => {
    const token = getToken();
    const body = new FormData();
    body.append('fichier', file);
    const res = await fetch(`${BASE}/employe-documents/import/analyser`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },
  confirmerImportFichesDePaie: (tempId, groupes) =>
    req('/employe-documents/import/confirmer', { method: 'POST', body: JSON.stringify({ tempId, groupes }) }),
  annulerImportFichesDePaie: (tempId) =>
    req('/employe-documents/import/annuler', { method: 'POST', body: JSON.stringify({ tempId }) }),

  // Documents coachs (CNI/passeport, diplômes, carte pro, autre) — manager uniquement
  getCoachDocuments: (coachId) => req(`/coach-documents/${coachId}`),
  uploadCoachDocument: async (coachId, file, type) => {
    const token = getToken();
    const body = new FormData();
    body.append('fichier', file);
    body.append('type', type);
    const res = await fetch(`${BASE}/coach-documents/${coachId}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },
  deleteCoachDocument: (id) => req(`/coach-documents/${id}`, { method: 'DELETE' }),
  downloadCoachDocument: (id, nomFichier) => telechargerFichierProtege(`/coach-documents/file/${id}`, nomFichier),

  // IP autorisées (accès en écriture depuis un compte non-manager)
  getIpAutorisees: () => req('/ip-autorisees'),
  addIpAutorisee:  (ip, label) => req('/ip-autorisees', { method: 'POST', body: JSON.stringify({ ip, label }) }),
  deleteIpAutorisee: (id) => req(`/ip-autorisees/${id}`, { method: 'DELETE' }),

  // Admin
  seedDemo: (reset = false) => req(`/admin/seed-demo${reset ? '?reset=1' : ''}`, { method: 'POST' }),
  downloadBackup: async () => {
    const token = getToken();
    const res = await fetch(`${BASE}/admin/backup`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const filename = cd.match(/filename="?([^"]+)"?/)?.[1] || 'fitnessmov-backup.db';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  importDatabase: async (file) => {
    const token = getToken();
    const body = new FormData();
    body.append('fichier', file);
    const res = await fetch(`${BASE}/admin/backup/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },
};
