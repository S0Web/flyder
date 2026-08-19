// Fuseau horaire de la salle : à définir AVANT tout usage de Date
// (le conteneur Railway est en UTC ; sans ça, la déconnexion "6h du matin"
// tombe à 8h heure française l'été).
process.env.TZ = process.env.TZ || 'Europe/Paris';

const express = require('express');
const cors    = require('cors');
const path    = require('path');

require('./db/database');
const { seedDefaults } = require('./db/seedDefaults');
seedDefaults(); // remplit le catalogue de cours si la base est vierge (nouvelle salle)

const { seedAnnuaire } = require('./db/seedAnnuaire');
seedAnnuaire(); // pré-remplit l'annuaire sur Corbeil-Essonnes si la table est vide

const { backfillCoachTags } = require('./db/backfillCoachTags');
backfillCoachTags('Corbeil-Essonnes', require('./db/coachTagsCorbeil'));

const { mergeCoachAliases, reassignAquaSeancesToCoach } = require('./db/mergeCoachAliases');
mergeCoachAliases('Corbeil-Essonnes', require('./db/coachAliasesCorbeil'));
// L'import historique associait "Myriam" par prénom seul, ambigu entre les deux
// coachs réelles "Myriam" (Aqua vs Contrat) — corrige les séances aqua mal attribuées.
reassignAquaSeancesToCoach('Corbeil-Essonnes', 'Myriam', 'Aqua', ['(Contrat)', '']);

const { recoverManager } = require('./db/recoverManager');
recoverManager('Ballancourt-sur-Essonne', 'Sofiann'); // filet de sécurité si le seul manager a été supprimé définitivement

const { requireAuth }   = require('./middleware/auth');
const { requireWriteAccess, requireAnnuaireAccess } = require('./middleware/ipAccess');
const { router: authRouter } = require('./routes/auth');
const configRouter    = require('./routes/config');
const healthRouter    = require('./routes/health');
const coachesRouter   = require('./routes/coaches');
const coursRouter     = require('./routes/coursTypes');
const seancesRouter   = require('./routes/seances');
const pointeursRouter = require('./routes/pointeurs');
const dashboardRouter = require('./routes/dashboard');
const analyticsRouter = require('./routes/analytics');
const appUsersRouter  = require('./routes/appUsers');
const tasksRouter     = require('./routes/tasks');
const personnelCreneauxRouter = require('./routes/personnelCreneaux');
const annuaireRouter  = require('./routes/annuaire');
const adminRouter     = require('./routes/admin');
const ipAutoriseesRouter = require('./routes/ipAutorisees');
const formationRouter = require('./routes/formation');
const employeDocumentsRouter = require('./routes/employeDocuments');
const coachDocumentsRouter = require('./routes/coachDocuments');
const ticketsRouter = require('./routes/tickets');
const changelogRouter = require('./routes/changelog');
const preferencesRouter = require('./routes/preferences');

const app  = express();
const PORT = process.env.PORT || 3001;

// Railway (et tout hébergeur derrière un reverse proxy) transmet l'IP réelle du
// client via X-Forwarded-For : sans "trust proxy", req.ip renverrait toujours l'IP
// interne du proxy, rendant la liste blanche d'IP inopérante.
app.set('trust proxy', true);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes publiques
app.use('/api/health', healthRouter);
app.use('/api/config', configRouter);
app.use('/api/auth',   authRouter);

// Routes protégées — requireWriteAccess ne bloque que les écritures (POST/PUT/PATCH/
// DELETE) des comptes non-managers hors IP autorisée ; les lectures (GET) passent.
app.use('/api/coaches',     requireAuth, requireWriteAccess, coachesRouter);
app.use('/api/cours-types', requireAuth, requireWriteAccess, coursRouter);
app.use('/api/seances',     requireAuth, requireWriteAccess, seancesRouter);
app.use('/api/pointeurs',   requireAuth, requireWriteAccess, pointeursRouter);
app.use('/api/dashboard',   requireAuth, dashboardRouter);
app.use('/api/analytics',   requireAuth, analyticsRouter);
app.use('/api/tickets',     requireAuth, ticketsRouter);
app.use('/api/changelog',   requireAuth, changelogRouter);
app.use('/api/preferences', requireAuth, preferencesRouter);
app.use('/api/app-users',   appUsersRouter);
app.use('/api/tasks',       requireAuth, requireWriteAccess, tasksRouter);
app.use('/api/personnel-creneaux',  requireAuth, requireWriteAccess, personnelCreneauxRouter);
// Annuaire : contient des coordonnées personnelles, ni lecture ni écriture hors accès privilégié.
app.use('/api/annuaire',   requireAuth, requireAnnuaireAccess, annuaireRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ip-autorisees', ipAutoriseesRouter);
// Formation : chaque route gère elle-même son niveau d'accès (lecture pour tout
// utilisateur authentifié, écriture réservée aux managers) — pas de middleware ici.
app.use('/api/formation', formationRouter);
// Documents salariés : chaque route gère elle-même son niveau d'accès (voir peutVoir
// dans routes/employeDocuments.js) — pas de middleware ici.
app.use('/api/employe-documents', employeDocumentsRouter);
// Documents coachs : manager uniquement (voir routes/coachDocuments.js).
app.use('/api/coach-documents', coachDocumentsRouter);

// Servir le front
const clientDist = path.join(__dirname, '../public');
app.use(express.static(clientDist));

// Images des articles Formation : stockées sur le volume persistant (jamais dans
// server/public, écrasé à chaque déploiement du client).
const DB_PATH_FOR_UPLOADS = process.env.DB_PATH || path.join(__dirname, '../data/fitnessmov.db');
app.use('/uploads', express.static(path.join(path.dirname(DB_PATH_FOR_UPLOADS), 'uploads')));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur', message: err.message });
});

function startServer(retry = 0) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Flyder — http://localhost:${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retry < 3) {
      const { execSync } = require('child_process');
      try {
        execSync(
          `FOR /F "tokens=5" %P IN ('netstat -a -n -o ^| findstr :${PORT}') DO TaskKill /F /PID %P`,
          { shell: 'cmd.exe', stdio: 'ignore' }
        );
      } catch (_) {}
      setTimeout(() => startServer(retry + 1), 800);
    } else {
      process.exit(1);
    }
  });
}
startServer();
