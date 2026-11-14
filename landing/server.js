import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3003;

const publicDir = path.join(__dirname, 'public');

// Les fichiers de /assets portent une empreinte dans leur nom (index-XXXX.js,
// vidéo, polices) : leur contenu ne change jamais sous un même nom, on peut
// donc les mettre en cache un an. Un fichier absent répond 404 plutôt que de
// retomber sur la page d'accueil.
app.use('/assets', express.static(path.join(publicDir, 'assets'), {
  immutable: true,
  maxAge: '1y',
  fallthrough: false,
}));

// Le reste (index.html, pages légales, favicons) est revalidé à chaque visite
// pour qu'une mise en ligne soit visible tout de suite.
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Flyder — landing — http://localhost:${PORT}`);
});
