# Fitnessmov Analytics Platform

Plateforme analytics full-stack développée pour optimiser le pilotage 
opérationnel d'une chaîne de salles de sport multi-sites.

## Contexte

Les données de séances étaient dispersées dans des fichiers Excel 
hétérogènes produits par différentes salles partenaires, rendant tout 
suivi de performance impossible et la réconciliation financière manuelle.

## Solution

Conception et développement d'une application web intégrant :
- Un pipeline ETL automatisé pour collecter et normaliser les données
- Une base de données relationnelle centralisée
- Un module analytics interactif avec KPIs configurables
- Un export de réconciliation financière automatique

## Résultats

- ~4 000 séances historiques migrées et normalisées
- KPIs consultables en temps réel par site
- Réconciliation financière automatisée (heures déclarées vs facturation)
- Déployé en production sur Railway, utilisé activement

## Stack technique

- **Front-end** : React
- **Back-end** : Node.js
- **Base de données** : SQLite
- **ETL** : Python / pandas
- **Hébergement** : Railway

## Architecture

[données] Excel hétérogènes
      ↓
[ETL] Python/pandas — extraction, nettoyage, normalisation
      ↓
[BDD] SQLite — schéma relationnel
      ↓
[API] Node.js — endpoints REST
      ↓
[UI]  React — dashboards et KPIs

## Captures d'écran

[ajouter tes captures ici]

## Lancement local

```bash
# Backend
cd server
npm install
node index.js

# Frontend
cd client
npm install
npm start
```

## Auteur

Selim OUADI — [selimouadi31@gmail.com](mailto:selimouadi31@gmail.com)
