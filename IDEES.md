# Boîte à idées — Flyder

Idées étudiées et mises de côté volontairement. Rien ici n'est à implémenter sans demande
explicite : ce fichier garde la trace de la réflexion pour ne pas la refaire. Le journal des
changements réalisés est `AMELIORATIONS.md`.

Dernière mise à jour : 30/09/2026 (décisions de l'audit).

---

## En attente du lien Flyder ↔ Flyder Talents

Ces trois idées dépendent de la même brique : relier Flyder à Flyder Talents (le coach vacataire
se connecte à Talents et y voit ses missions). À reprendre ensemble, pas séparément.

### Disponibilités des coachs vacataires
- **Besoin.** Savoir quand un vacataire peut intervenir, et être alerté si une séance est planifiée
  sur un créneau où il n'est pas disponible.
- **Piste.** Table de disponibilités par coach (jour, plage horaire, période), saisie côté Talents
  puis lue par Flyder ; alerte sur la séance et dans « Séances sans coach ».
- **Pourquoi en attente.** La saisie n'a de sens que si le coach la fait lui-même, donc via Talents.

### Accès du coach vacataire à son planning et à son récap d'heures
- **Besoin.** Le coach voit ses séances et ses heures du mois sans les demander au manager.
- **Piste.** Le coach se connecte à Flyder Talents et y voit ses missions ; Flyder expose en lecture
  seule ses séances et son récap d'heures (API dédiée, jamais les profils Flyder).
- **Pourquoi en attente.** Flyder n'a pas de compte pour les vacataires (la fiche `coaches` n'est pas
  un utilisateur) et ce n'est pas le bon endroit pour en créer.

### Coordination des deux outils
- Point de départ probable : l'identité du coach (`coaches.id` côté Flyder ↔ fiche Talents).

---

## Quand le produit sera vendu à d'autres salles

### Notifications e-mail ou push
- **Besoin.** Être prévenu sans ouvrir l'application : tâche assignée, bilan à valider ou renvoyé,
  séance sans coach à J-3.
- **Piste.** File de notifications côté serveur (événement → destinataire → canal), préférences par
  utilisateur (Préférences), e-mail d'abord, push web ensuite. Les événements existent déjà : la
  pastille Équipe les compte.
- **Pourquoi en attente.** Utile avec beaucoup d'utilisateurs et des managers peu présents dans
  l'application ; pas nécessaire pour les deux salles actuelles.

---

## Sans suite pour l'instant

### Semaines modèles (scolaire, vacances, été)
- **Besoin.** Remplacer « dupliquer la semaine précédente » par des semaines types que l'on applique
  à une semaine donnée.
- **Piste.** La table `planning_recurrent` existe déjà (cours, coach, jour, horaire, durée, actif) ;
  il manquerait un regroupement en « modèles » nommés et un bouton « appliquer ce modèle ».
- **Décision.** Inutile pour l'instant.

### Note de satisfaction par séance
- **Besoin.** Croiser la satisfaction avec le remplissage dans l'Analyse.
- **Questions ouvertes (bloquantes).** Qui note ? Comment récupérer la donnée ? Demander aux adhérents
  à chaque séance est lourd. Sans canal de collecte simple (QR code en salle, retour du coach, sondage
  périodique…), la donnée serait trop rare pour être exploitable.
- **Décision.** À reprendre seulement si un moyen de collecte léger apparaît.

---

## Écarté définitivement

### Disciplines configurables en Préférences
- **Décision.** Aqua = discipline dans l'eau ; Fitness = tout le reste (cross-training, boxe, pole
  dance, cours collectifs traditionnels). La case « cours Aqua » reste telle quelle.
