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
const { scheduleDailyBackup } = require('./lib/backup');

const app  = express();
const PORT = process.env.PORT || 3002;

app.set('trust proxy', true);

app.use(cors({
  origin: (origin, cb) => cb(null, true),
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

const clientDist = path.join(__dirname, '../public');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🔐 Flyder Admin — http://localhost:${PORT}`);
  scheduleDailyBackup();
});
