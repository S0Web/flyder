const express = require('express');
const cors    = require('cors');
const path    = require('path');

require('./db/database');

const { requireAuth } = require('./middleware/auth');
const authRouter    = require('./routes/auth');
const clientsRouter = require('./routes/clients');

const app  = express();
const PORT = process.env.PORT || 3002;

app.set('trust proxy', true);

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/clients', requireAuth, clientsRouter);

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
});
