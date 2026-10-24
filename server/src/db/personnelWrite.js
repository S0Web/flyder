const db = require('./database');

const CATEGORIES = ['normale', 'complementaire', 'supplementaire'];

// Remplace tous les créneaux d'un employé pour une date donnée (segments de travail,
// ou une ligne d'absence unique) — utilisé par la route PUT et par le script de seed.
function upsertJour(employeId, date, payload) {
  const { type = 'travail', segments = [], notes = null } = payload;

  db.run('BEGIN');
  try {
    db.run('DELETE FROM personnel_creneaux WHERE employe_id = ? AND date = ?', [employeId, date]);

    if (type === 'travail') {
      segments.forEach((seg, i) => {
        const categorie = CATEGORIES.includes(seg.categorie) ? seg.categorie : 'normale';
        db.run(
          `INSERT INTO personnel_creneaux (employe_id, date, type, debut, fin, ordre, notes, categorie)
           VALUES (?, ?, 'travail', ?, ?, ?, ?, ?)`,
          [employeId, date, seg.debut, seg.fin, i, i === 0 ? (notes || null) : null, categorie]
        );
      });
    } else if (type) {
      db.run(
        `INSERT INTO personnel_creneaux (employe_id, date, type, debut, fin, ordre, notes)
         VALUES (?, ?, ?, NULL, NULL, 0, ?)`,
        [employeId, date, type, notes || null]
      );
    }

    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

module.exports = { upsertJour };
