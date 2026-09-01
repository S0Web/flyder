const express = require('express');
const cors    = require('cors');
const path    = require('path');

require('./db/database');

const { requireAuth } = require('./middleware/auth');
const { requireClientApiKey } = require('./middleware/clientAuth');
const authRouter      = require('./routes/auth');
const clientsRouter   = require('./routes/clients');
const ticketsRouter    = require('./routes/tickets');
const gymTicketsRouter = require('./routes/gymTickets');
const changelogRouter    = require('./routes/changelog');
const gymChangelogRouter = require('./routes/gymChangelog');
const gymStatusRouter    = require('./routes/gymStatus');
const stripeWebhookRouter = require('./routes/stripeWebhook');
const leadsRouter = require('./routes/leads');
const { scheduleDailyBackup } = require('./lib/backup');

const app  = express();
const PORT = process.env.PORT || 3002;

app.set('trust proxy', true);

// admin-client est servi par ce même serveur en production : same-origin, pas
// besoin de CORS pour lui. Le seul appel cross-origin légitime est celui du
// formulaire de contact de la landing page (flyder.fr) vers /api/leads — d'où
// flyder.fr dans la liste. Un navigateur cross-origin non listé ne peut pas
// lire la réponse ; les appels non-navigateur (webhook Stripe, curl, serveurs
// de salle) ne sont eux jamais concernés par CORS et continuent de fonctionner.
const allowedOrigins = [
  'https://flyder.fr',
  'https://www.flyder.fr',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3002',
];

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Le webhook Stripe doit être monté AVANT express.json() : la vérification de
// signature a besoin du corps de requête brut, pas déjà parsé en JSON.
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookRouter);

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/clients', requireAuth, clientsRouter);
app.use('/api/tickets', requireAuth, ticketsRouter);
app.use('/api/gym/tickets', requireClientApiKey, gymTicketsRouter);
app.use('/api/changelog', requireAuth, changelogRouter);
app.use('/api/gym/changelog', requireClientApiKey, gymChangelogRouter);
app.use('/api/gym/status', requireClientApiKey, gymStatusRouter);
// Public (pas de requireAuth) : appelée depuis le formulaire de contact de
// flyder.fr, un site statique séparé sans notion d'utilisateur connecté.
app.use('/api/leads', leadsRouter);

const clientDist = path.join(__dirname, '../public');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err, req, res, next) => {
  // Le détail complet reste dans les logs serveur uniquement — jamais renvoyé
  // au client, qui pourrait exposer des chemins internes, requêtes SQL ou
  // autres détails d'implémentation à quiconque provoque une erreur 500.
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur, réessaie dans un instant.' });
});

app.listen(PORT, () => {
  console.log(`🔐 Flyder Admin — http://localhost:${PORT}`);
  scheduleDailyBackup();
});
