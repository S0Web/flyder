// Déchiffre une sauvegarde automatique téléchargée depuis le bucket R2.
// Usage : BACKUP_ENCRYPTION_KEY=... node src/db/restoreBackup.js <fichier.db.enc> <sortie.db>
//
// Le fichier obtenu peut ensuite remplacer le fichier pointé par DB_PATH sur
// le volume Railway (arrêter le service, remplacer le fichier, redémarrer).

const fs = require('fs');
const crypto = require('crypto');

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error('Usage : BACKUP_ENCRYPTION_KEY=... node src/db/restoreBackup.js <fichier.db.enc> <sortie.db>');
  process.exit(1);
}
if (!process.env.BACKUP_ENCRYPTION_KEY) {
  console.error('Variable BACKUP_ENCRYPTION_KEY manquante — c\'est la même valeur que sur le service Railway concerné.');
  process.exit(1);
}

// Format : [12 octets IV][16 octets tag d'authentification][ciphertext] — cf. lib/backup.js
const data = fs.readFileSync(inputPath);
const iv = data.subarray(0, 12);
const authTag = data.subarray(12, 28);
const ciphertext = data.subarray(28);

const key = crypto.createHash('sha256').update(process.env.BACKUP_ENCRYPTION_KEY).digest();
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(authTag);

try {
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  fs.writeFileSync(outputPath, decrypted);
  console.log(`✅ Base restaurée : ${outputPath}`);
} catch (e) {
  console.error('Échec du déchiffrement — clé incorrecte ou fichier corrompu :', e.message);
  process.exit(1);
}
