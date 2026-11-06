# Rezo Ayiti 🇭🇹

> Plateforme citoyenne et open-source de signalement et de cartographie collaborative des infrastructures et services publics en Haïti.

[![Licence MIT](https://img.shields.io/badge/Licence-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38bdf8.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20PostGIS-3ecf8e.svg)](https://supabase.com/)

---

## 📌 Présentation

**Rezo Ayiti** permet aux citoyens haïtiens, aux organisations locales et aux décideurs publics de signaler, visualiser et suivre en temps réel l'état des infrastructures critiques :
- 💧 **Eau** (coupures, points d'eau potables défectueux, fuites majeures)
- ⚡ **Électricité** (pannes réseau, transformateurs endommagés, câbles à terre)
- 🛣️ **Routes & Transports** (routes coupées, nids-de-poule dangereux, inondations, éboulements)
- 🏥 **Santé & Secours** (dispensaires ouverts/fermés, urgences, pharmacies de garde)

Le projet est conçu en approche **mobile-first** pour être utilisable sur smartphone, même avec une connectivité réseau intermittente.

---

## 🛠️ Stack Technique

- **Framework Web :** [Next.js](https://nextjs.org/) (App Router, React 19)
- **Langage :** [TypeScript](https://www.typescriptlang.org/) (mode strict)
- **Styling :** [Tailwind CSS](https://tailwindcss.com/)
- **Base de données & Backend :** [Supabase](https://supabase.com/) (PostgreSQL + extension géospatiale **PostGIS**)
- **Client Supabase :** `@supabase/supabase-js`
- **Qualité de code :** ESLint

---

## 📁 Structure du Projet

```text
rezo-ayiti/
├── app/                  # Pages et layouts Next.js (App Router)
│   ├── favicon.ico
│   ├── globals.css       # Styles globaux Tailwind CSS
│   ├── layout.tsx        # Layout racine et métadonnées
│   └── page.tsx          # Page d'accueil mobile-first
├── components/           # Composants React réutilisables (UI, cartes, formulaires)
├── lib/                  # Utilitaires et clients (client Supabase, helpers)
│   └── supabase.ts       # Client Supabase initialisé
├── public/               # Fichiers statiques publics
├── supabase/             # Schémas et migrations de la base de données
│   └── migrations/
│       └── 001_init_reports.sql # Schéma initial (reports, PostGIS, index)
├── types/                # Types TypeScript partagés
│   └── report.ts         # Types Report, ReportCategory, ReportStatus
├── .env.example          # Gabarit des variables d'environnement requises
├── LICENSE               # Licence MIT
├── package.json          # Dépendances et scripts npm
├── tsconfig.json         # Configuration TypeScript
└── README.md             # Documentation du projet
```

---

## ⚙️ Installation et Démarrage Local

### 1. Prérequis
- [Node.js](https://nodejs.org/) v20+ ou v22+
- [Git](https://git-scm.com/)
- Un projet [Supabase](https://supabase.com/)

### 2. Cloner le projet
```bash
git clone https://github.com/GuerrierRuben/rezo-haiti.git rezo-ayiti
cd rezo-ayiti
```

### 3. Installer les dépendances
```bash
npm install
```

### 4. Configurer les variables d'environnement
Copiez `.env.example` en `.env.local` :
```bash
cp .env.example .env.local
```

Puis renseignez vos clés Supabase dans `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-publique
```

### 5. Exécuter la migration SQL initiale
Dans l'interface Supabase de votre projet, rendez-vous dans le **SQL Editor** et exécutez le contenu du fichier :
[`supabase/migrations/001_init_reports.sql`](supabase/migrations/001_init_reports.sql)

### 6. Lancer le serveur de développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 📋 Commandes Utiles

- `npm run dev` : Démarre le serveur de développement Next.js.
- `npm run build` : Compile le projet pour la production.
- `npm run start` : Lance le serveur en mode production après le build.
- `npm run lint` : Exécute ESLint pour vérifier la qualité du code.

---

## 🗺️ Feuille de Route (Roadmap en 5 Sprints)

| Sprint | Objectif | Livrables clés |
| :--- | :--- | :--- |
| **Sprint 1 (Actuel)** | **Fondations & Architecture** | Initialisation Next.js + Tailwind + TypeScript, schéma SQL PostgreSQL/PostGIS, client Supabase, configuration Git et CI. |
| **Sprint 2** | **Signalement Citoyen** | Formulaire mobile de signalement avec géolocalisation GPS, validation des entrées et insertion dans Supabase. |
| **Sprint 3** | **Cartographie Interactive** | Intégration de la carte (MapLibre / Leaflet), affichage des signalements par catégorie et clustering géographique PostGIS. |
| **Sprint 4** | **Modération & Statuts** | Interface d'administration pour la validation communautaire, historique des changements de statut (en attente, validé, résolu). |
| **Sprint 5** | **Offline-First & Notifications** | PWA (Progressive Web App) avec support hors-ligne, mise en cache locale et flux d'alertes citoyennes. |

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour proposer une amélioration ou corriger un problème :
1. Forkez le dépôt.
2. Créez une branche dédiée (`git checkout -b feature/ma-fonctionnalite`).
3. Effectuez vos commits (`git commit -m 'feat: description claire'`).
4. Poussez votre branche (`git push origin feature/ma-fonctionnalite`).
5. Ouvrez une Pull Request.

---

## 📄 Licence

Ce projet est distribué sous licence open-source **MIT**. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.
