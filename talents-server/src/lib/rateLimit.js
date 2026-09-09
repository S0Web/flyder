// Limiteur mémoire minimal par IP, sans dépendance — suffisant pour freiner la
// force brute sur login/inscription à l'échelle d'un seul process (une seule
// instance Railway). `trust proxy` est activé dans index.js, req.ip est donc
// l'IP réelle du client derrière le proxy Railway.
const buckets = new Map();

function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const now = Date.now();
    let b = buckets.get(req.ip);
    if (!b || now > b.reset) {
      b = { count: 0, reset: now + windowMs };
      buckets.set(req.ip, b);
    }
    b.count += 1;
    if (b.count > max) {
      return res.status(429).json({ error: 'Trop de tentatives, réessaie dans quelques minutes.' });
    }
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of buckets) if (now > b.reset) buckets.delete(ip);
}, 60 * 1000).unref();

module.exports = { rateLimit };
