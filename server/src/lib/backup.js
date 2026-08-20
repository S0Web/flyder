const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../db/database');

// Sauvegarde automatique quotidienne, chiffrée, vers un stockage objet externe
// à Railway (Cloudflare R2 — compatible S3) — le but est de survivre à un
// problème *sur* Railway (volume perdu, mauvaise manip), donc hors de Railway.
// Silencieuse si non configurée, comme le mailer de tickets : une salle qui
// n'a pas encore ces variables d'env continue de fonctionner normalement.

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/fitnessmov.db');
const RETENTION_JOURS = 30;

function isConfigured() {
  return !!(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET &&
    process.env.BACKUP_ENCRYPTION_KEY
  );
}

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// AES-256-GCM : la base contient des fiches de paie et des arrêts maladie,
// le chiffrement du bucket seul ne suffit pas — la clé ne doit exister que
// dans les variables d'env Railway, jamais dans le bucket lui-même.
// Format du fichier : [12 octets IV][16 octets tag d'authentification][ciphertext]
function encrypt(buffer) {
  const key = crypto.createHash('sha256').update(process.env.BACKUP_ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

function backupPrefix() {
  return (process.env.SALLE_NOM || 'salle').replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function pruneOldBackups(client, prefix) {
  const list = await client.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET, Prefix: `${prefix}/` }));
  const cutoff = Date.now() - RETENTION_JOURS * 24 * 60 * 60 * 1000;
  for (const obj of list.Contents || []) {
    if (obj.LastModified && obj.LastModified.getTime() < cutoff) {
      await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: obj.Key }));
    }
  }
}

async function runBackup() {
  if (!isConfigured()) {
    console.warn('Sauvegarde auto non configurée (variables R2_*/BACKUP_ENCRYPTION_KEY manquantes) — ignorée');
    return;
  }
  try {
    // Le journal WAL peut contenir des écritures récentes pas encore dans le
    // fichier principal ; on force leur écriture avant de le lire.
    db.run('PRAGMA wal_checkpoint(TRUNCATE)');
    const encrypted = encrypt(fs.readFileSync(DB_PATH));

    const prefix = backupPrefix();
    const key = `${prefix}/${new Date().toISOString().slice(0, 10)}.db.enc`;
    const client = getClient();
    await client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, Body: encrypted }));
    console.log(`✅ Sauvegarde automatique envoyée : ${key}`);

    await pruneOldBackups(client, prefix);
  } catch (e) {
    console.error('Échec de la sauvegarde automatique :', e.message);
  }
}

// Programme le premier passage à 3h du matin (heure du conteneur), puis une
// fois par jour ensuite. Un redémarrage du service recalcule simplement le
// prochain horaire, sans double-exécution possible.
function scheduleDailyBackup() {
  if (!isConfigured()) return;
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  setTimeout(() => {
    runBackup();
    setInterval(runBackup, 24 * 60 * 60 * 1000);
  }, next - now);
}

module.exports = { runBackup, scheduleDailyBackup, isConfigured };
