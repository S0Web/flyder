const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireManager } = require('../middleware/auth');
const { normalizeIp } = require('../middleware/ipAccess');
const { logAudit } = require('../lib/audit');

// GET /api/ip-autorisees — liste + IP actuelle de l'appelant (pour faciliter l'ajout)
router.get('/', requireManager, (req, res) => {
  const ips = db.all('SELECT * FROM ip_autorisees ORDER BY created_at DESC');
  res.json({ ips, votreIp: normalizeIp(req.ip) });
});

// POST /api/ip-autorisees — ajoute une IP à la liste blanche
router.post('/', requireManager, (req, res) => {
  const ip = (req.body.ip || '').trim();
  const label = (req.body.label || '').trim() || null;
  if (!ip) return res.status(400).json({ error: 'Adresse IP requise' });
  try {
    const result = db.run('INSERT INTO ip_autorisees (ip, label) VALUES (?, ?)', [ip, label]);
    logAudit({ userId: req.user.id, action: 'create_ip_autorisee', entity: 'ip_autorisees', entityId: result.lastInsertRowid,
      details: `${ip}${label ? ` (${label})` : ''} ajoutée` });
    res.status(201).json(db.get('SELECT * FROM ip_autorisees WHERE id = ?', [result.lastInsertRowid]));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Cette IP est déjà autorisée' });
    throw e;
  }
});

// DELETE /api/ip-autorisees/:id
router.delete('/:id', requireManager, (req, res) => {
  const existing = db.get('SELECT * FROM ip_autorisees WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  db.run('DELETE FROM ip_autorisees WHERE id = ?', [req.params.id]);
  logAudit({ userId: req.user.id, action: 'delete_ip_autorisee', entity: 'ip_autorisees', entityId: existing.id,
    details: `${existing.ip}${existing.label ? ` (${existing.label})` : ''} retirée` });
  res.json({ ok: true });
});

module.exports = router;
