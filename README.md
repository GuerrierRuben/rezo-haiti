# Rezo Ayiti 🇭🇹

> Plateforme citoyenne et open-source de signalement, cartographie et modération collaborative des infrastructures et services publics en Haïti.

[![CI](https://github.com/GuerrierRuben/rezo-haiti/actions/workflows/ci.yml/badge.svg)](https://github.com/GuerrierRuben/rezo-haiti/actions/workflows/ci.yml)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38bdf8.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900.svg)](https://leafletjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20PostGIS-3ecf8e.svg)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-5.x-729B1B.svg)](https://vitest.dev/)

---

## 📌 Présentation

**Rezo Ayiti** permet aux citoyens haïtiens, aux collectivités locales et aux décideurs publics de cartographier, signaler et suivre l'état des infrastructures critiques à travers le pays :
- 💧 **Eau** : coupures, fuites sur conduites principales, bornes-fontaines en panne.
- ⚡ **Électricité** : transformateurs endommagés, câbles à terre, coupures prolongées de secteur.
- 🛣️ **Route & Infrastructure** : chaussées dégradées, nids-de-poule dangereux, éboulements, ponts impraticables.
- 🏥 **Santé & Urgence** : dispensaires fermés, ruptures d'approvisionnement en intrants, urgences sanitaires.

Conçue avec une approche **mobile-first**, l'interface s'adapte parfaitement aux smartphones et fonctionne sur des débits réseau réduits.

---

## ✨ Fonctionnalités Principales

### 1. Cartographie Interactive Directe (Leaflet & OpenStreetMap)
- Vue initiale centrée sur l'ensemble d'Haïti (`[18.9712, -72.2852]`, zoom 8).
- Marqueurs dynamiques vectoriels (`L.divIcon`) personnalisés par catégorie d'infrastructure.
- Popups sécurisés contre les failles d'injection HTML/XSS (construction via les APIs DOM standards).
- Navigation fluide sans réinitialisation de la vue lors des mises à jour des données.

### 2. Signalement Citoyen Géolocalisé & Protection Anti-Spam
- Sélection des coordonnées GPS en cliquant directement sur la carte (curseur en croix `crosshair`).
- Marqueur temporaire distinctif avec animation de pulsation (`animate-ping`).
- Validation stricte côté client et côté serveur avec Zod sur la boîte englobante d'Haïti :
  - **Latitude** : de `17.9` à `20.2`
  - **Longitude** : de `-74.6` à `-71.6`
- **Protection anti-spam multicouche** :
  - **Pot de miel (Honeypot)** : champ masqué invisible aux utilisateurs mais rempli par les robots spammeurs, retournant un faux succès immédiat sans écriture en base.
  - **Limitation de débit (Rate Limiting)** : restriction à 5 soumissions par fenêtre glissante de 10 minutes par adresse IP (anonymisée par hachage SHA-256 salé), avec retour HTTP 429 et en-tête `Retry-After: 600`.
  - **Contrôle d'accès SQL** : révocation des privilèges `INSERT` directs pour les rôles `anon` et `authenticated`, forçant le passage par l'API serveur sécurisée.

### 3. Liste Publique des Signalements (Lecture Seule)
- Composant dédié [`ReportCard`](components/ReportCard.tsx) affichant les signalements publics validés.
- Badges de catégorie et de statut (*Eau*, *Électricité*, *Route*, *Santé* ; *En attente*, *Validé*, *Résolu*).
- Dates formatées en français (`fr-FR`) et coordonnées GPS.
- Compteur honnête de signalements visibles sans prétention de temps réel non garanti.

### 4. Espace de Modération Sécurisé (`/moderation`)
- Authentification native Supabase Auth (email / mot de passe).
- **Contrôle d'accès strict par rôle** :
  - Utilisateur non connecté : formulaire d'authentification.
  - Rôle `citoyen` : écran de refus formel (*« Accès réservé aux modérateurs »*), aucune donnée de signalement chargée ni affichée.
  - Rôles `moderateur` ou `admin` : tableau de bord de modération avec compteurs par statut (*Total*, *En attente*, *Validé*, *Résolu*), filtres croisés et sélecteur de statut inline par ligne.
- Sécurité garantie au niveau de la base de données via **Row Level Security (RLS)** : le changement de statut est impossible pour un utilisateur non autorisé, même en manipulant l'API.

---

## 🛠️ Stack Technique

| Domaine | Technologies |
| :--- | :--- |
| **Framework Full-Stack** | Next.js 16 (App Router, Turbopack, React 19) |
| **Langage & Typage** | TypeScript (mode strict, typage unifié dans `types/`) |
| **Style & Responsive** | Tailwind CSS 4 (utilitaires modernes, mobile-first) |
| **Cartographie** | Leaflet 1.9.4 (intégration directe sans wrapper lourd, tuiles OpenStreetMap) |
| **Base de Données & Auth** | Supabase (PostgreSQL 15+, extension géospatiale PostGIS) |
| **Validation des données** | Zod 4 (schémas stricts pour signalements et profils) |
| **Tests Automatisés** | Vitest 5 (tests unitaires et routes d'API mockées) |
| **Sécurité & Headers** | CSP, HSTS, X-Frame-Options, anti-spam honeypot + rate-limiting |
| **CI / CD** | GitHub Actions & Dependabot |

---

## 📁 Architecture des Dossiers

```text
rezo-ayiti/
├── .github/                      # Workflows CI et bots
│   ├── dependabot.yml            # Veille hebdomadaire des dépendances npm
│   └── workflows/ci.yml          # Pipeline GitHub Actions (lint, test, build)
├── app/                          # Routes Next.js App Router
│   ├── api/                      # Endpoints REST (CRUD reports, health, nearby, users)
│   ├── moderation/               # Espace réservé de modération (/moderation)
│   ├── error.tsx                 # Page d'erreur 500 conviviale avec bouton réessai
│   ├── not-found.tsx             # Page 404 conviviale avec redirection
│   ├── globals.css               # Feuilles de style Tailwind CSS
│   ├── layout.tsx                # Métadonnées OpenGraph et structure HTML globale
│   └── page.tsx                  # Page d'accueil publique (carte + formulaire + liste)
├── components/                   # Composants React réutilisables
│   ├── MapComponent.tsx          # Carte Leaflet interactive (marqueurs, clics, sélection)
│   ├── ModerationList.tsx        # Tableau de bord et filtres de modération
│   └── ReportCard.tsx            # Carte de signalement publique (lecture seule, anti-XSS)
├── docs/                         # Documentation technique, tests et déploiement
│   ├── API.md                    # Spécification détaillée des endpoints REST
│   ├── DEPLOYMENT.md             # Guide pas à pas de mise en production Vercel & Supabase
│   └── TESTING.md                # Checklist exhaustive des tests manuels
├── lib/                          # Clients et utilitaires
│   ├── api-helpers.ts            # Réponses JSON formatées (jsonOk, jsonError)
│   ├── rate-limit.ts             # Fonctions pures de hachage IP et limitation de débit
│   ├── supabase.ts               # Client Supabase public (@supabase/supabase-js)
│   ├── supabase-admin.ts         # Client Supabase serveur sécurisé (Service Role Key)
│   ├── supabase-server.ts        # Client Supabase côté serveur avec token Bearer
│   └── validations.ts            # Schémas de validation Zod et boîte englobante Haïti
├── services/                     # Couche de services centralisée
│   ├── authService.ts            # Authentification (signIn, signOut, getCurrentProfile)
│   └── reportService.ts          # Requêtes reports (get, create via API, updateReportStatus)
├── supabase/                     # Migrations PostgreSQL et politiques RLS
│   └── migrations/
│       ├── 001_init_reports.sql      # Extension PostGIS et table reports initiale
│       ├── 002_profiles_rls_geo.sql  # Table profiles, rôles, RLS et fonction PostGIS
│       └── 003_submission_guard.sql  # Table audit submission_log, index et révocation INSERT
├── tests/                        # Suite de tests automatisés Vitest
│   ├── rate-limit.test.ts        # Tests unitaires du hachage et des seuils de débit
│   ├── reports-route.test.ts     # Tests d'intégration de la route POST /api/reports
│   ├── services.test.ts          # Tests unitaires de la couche de services
│   └── validations.test.ts       # Tests unitaires des schémas de validation Zod
├── types/                        # Définitions TypeScript centralisées
├── .env.example                  # Modèle exhaustif des variables client et serveur
├── vitest.config.mjs             # Configuration de la suite de tests Vitest
├── LICENSE                       # Licence open-source MIT
└── package.json                  # Dépendances et scripts de build
```

---

## ⚙️ Installation et Démarrage Local

### 1. Prérequis
- [Node.js](https://nodejs.org/) v20+ ou v22+
- [Git](https://git-scm.com/)
- Un projet [Supabase](https://supabase.com/) actif

### 2. Cloner le dépôt
```bash
git clone https://github.com/GuerrierRuben/rezo-haiti.git
cd rezo-haiti
```

### 3. Installer les dépendances
```bash
npm install
```

### 4. Configurer les variables d'environnement
Créez un fichier `.env.local` à la racine à partir du modèle fourni :
```bash
cp .env.example .env.local
```

Renseignez les variables requises (voir détails dans `.env.example`) :
```env
# Variables publiques (navigateur)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-publique

# Variables secrètes (serveur uniquement)
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role-secrete
RATE_LIMIT_SALT=votre_sel_aleatoire_secret_32_caracteres
```

---

## 🗄️ Exécution des Migrations SQL dans Supabase

Dans l'interface web de votre projet Supabase, ouvrez l'onglet **SQL Editor** et exécutez successivement le contenu des migrations suivantes :

1. **[`supabase/migrations/001_init_reports.sql`](supabase/migrations/001_init_reports.sql)** :
   - Active l'extension `postgis`.
   - Crée la table de base `public.reports`.
2. **[`supabase/migrations/002_profiles_rls_geo.sql`](supabase/migrations/002_profiles_rls_geo.sql)** :
   - Crée la table `public.profiles` liée à `auth.users(id)` avec les rôles (`citoyen`, `moderateur`, `admin`).
   - Installe le trigger de création automatique de profil.
   - Ajoute la colonne spatiale `location` et la fonction RPC `nearby_reports`.
   - Active le **Row Level Security (RLS)** sur `reports` et `profiles`.
3. **[`supabase/migrations/003_submission_guard.sql`](supabase/migrations/003_submission_guard.sql)** :
   - Crée la table `submission_log` pour la limitation de débit.
   - Active le RLS sans politique publique (serveur admin uniquement).
   - Révoque le droit `INSERT` direct sur `reports` pour `anon` et `authenticated`.

---

## 👤 Création et Promotion d'un Compte Modérateur

1. Créez l'utilisateur dans Supabase (**Authentication > Users** > **Add user**).
2. Promouvez-le via SQL Editor :
   ```sql
   UPDATE public.profiles
   SET role = 'moderateur'
   WHERE id = (
       SELECT id FROM auth.users WHERE email = 'moderateur@rezoayiti.org'
   );
   ```
3. Connectez-vous sur [http://localhost:3000/moderation](http://localhost:3000/moderation).

---

## 🧪 Tests Automatisés

Le projet inclut une suite complète de 29 tests unitaires et d'intégration couvrant :
- La validation des coordonnées GPS et des champs Zod (`tests/validations.test.ts`).
- Le hachage cryptographique et les seuils de limitation de débit (`tests/rate-limit.test.ts`).
- La route serveur `POST /api/reports` avec honeypot et rate limiting (`tests/reports-route.test.ts`).
- Les services de récupération et de mise à jour de statut (`tests/services.test.ts`).

Pour exécuter les tests :
```bash
# Lancement ponctuel (utilisé en CI)
npm run test:run

# Mode interactif avec surveillance des fichiers (watch)
npm test
```

---

## 🚀 Déploiement en Production

Le guide exhaustif de mise en production sur **Vercel** avec base de données **Supabase** est disponible dans la documentation dédiée :
👉 [**Guide de Déploiement en Production (docs/DEPLOYMENT.md)**](docs/DEPLOYMENT.md)

Ce guide détaille la configuration des variables d'environnement, les redirections Supabase Auth, la checklist post-déploiement et la procédure de rotation des clés secrètes en cas d'urgence.

---

## 🚦 Feuille de Route et Avancement

- [x] **Sprint 1** : Initialisation Next.js 16 + TypeScript + Tailwind CSS 4 + Client Supabase.
- [x] **Sprint 2** : Schémas SQL géospatiaux (PostGIS), profils, RLS et API REST paginée.
- [x] **Sprint 3** : Types unifiés, couche de services réutilisable et carte interactive Leaflet.
- [x] **Sprint 4** : Signalement citoyen interactif au clic sur la carte et validation de la bbox Haïti.
- [x] **Sprint 5** : Espace de modération sécurisé avec filtrage par statut et contrôle de rôles.
- [x] **Sprint 6** : Protection anti-spam serveur (honeypot + rate limit), headers de sécurité, suite de tests Vitest, CI GitHub Actions, Dependabot et guide de déploiement.

---

## 🤝 Contribution

Les contributions de la communauté sont encouragées ! Pour participer :
1. Forkez le projet.
2. Créez une branche dédiée (`git checkout -b feature/amelioration-carte`).
3. Appliquez des commits conventionnels et atomiques (`git commit -m 'feat: description claire'`).
4. Vérifiez que `npm run lint`, `npm run test:run` et `npm run build` passent sans erreur.
5. Poussez votre branche et ouvrez une Pull Request.

---

## 📄 Licence

Ce projet est distribué sous licence open-source **MIT**. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.
