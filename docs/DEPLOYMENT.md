# Guide de Déploiement en Production — Rezo Ayiti

Ce document décrit pas à pas la procédure de mise en production de **Rezo Ayiti** sur la plateforme [Vercel](https://vercel.com) avec une base de données managée [Supabase](https://supabase.com).

---

## 1. Prérequis

Avant de déployer, assurez-vous d'avoir :
- Un compte [GitHub](https://github.com) avec le dépôt `rezo-haiti` synchronisé sur la branche `main`.
- Un compte [Vercel](https://vercel.com) connecté à votre compte GitHub.
- Un projet [Supabase](https://supabase.com) actif avec l'extension **PostGIS** activée.
- Node.js 20+ installé localement pour vos vérifications éventuelles.

---

## 2. Déploiement sur Vercel

### Étape 2.1 : Importer le dépôt
1. Connectez-vous à la console Vercel et cliquez sur **Add New... > Project**.
2. Sélectionnez le dépôt `rezo-haiti` dans votre liste de dépôts GitHub.
3. Laissez le framework preset sur **Next.js** (détecté automatiquement).
4. Le répertoire racine (Root Directory) doit être `./`.

### Étape 2.2 : Configurer les Variables d'Environnement
Dans la section **Environment Variables** de Vercel, ajoutez les variables suivantes :

| Variable | Visibilité | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Publique (Client & Serveur) | URL de l'instance Supabase (ex: `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publique (Client & Serveur) | Clé publique anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secrète (Serveur uniquement)** | Clé de service administrateur Supabase (Bypass RLS pour l'insertion contrôlée) |
| `RATE_LIMIT_SALT` | **Secrète (Serveur uniquement)** | Sel cryptographique aléatoire (32+ caractères) pour l'anonymisation SHA-256 des adresses IP |

> [!WARNING]
> La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit **JAMAIS** être préfixée par `NEXT_PUBLIC_` et ne doit être utilisée que dans le contexte d'exécution serveur Next.js (`lib/supabase-admin.ts`).

### Étape 2.3 : Déployer
1. Cliquez sur **Deploy**.
2. Vercel compile l'application, applique les optimisations Next.js et déploie le projet sur une URL de production (ex: `https://rezo-ayiti.vercel.app`).

---

## 3. Configuration de Supabase Auth

Pour que les redirections d'authentification et les liens de confirmation fonctionnent avec le domaine de production :

1. Rendez-vous dans le tableau de bord Supabase : **Authentication > URL Configuration**.
2. **Site URL** : définissez l'URL canonique de production :
   ```
   https://rezo-ayiti.vercel.app
   ```
3. **Redirect URLs** : ajoutez les motifs suivants pour autoriser le développement local et les prévisualisations Vercel :
   ```
   http://localhost:3000/**
   https://rezo-ayiti.vercel.app/**
   https://*-guerrier-rubens-projects.vercel.app/**
   ```
4. Cliquez sur **Save**.

---

## 4. Application des Migrations SQL Supabase

Assurez-vous que l'ensemble des migrations du répertoire `supabase/migrations/` ont été exécutées dans le **SQL Editor** de Supabase, dans l'ordre chronologique :

1. **`001_initial_schema.sql`** :
   - Activation de PostGIS (`CREATE EXTENSION IF NOT EXISTS postgis`).
   - Création de la table `reports` initiale.
2. **`002_profiles_rls_geo.sql`** :
   - Création de la table `profiles` avec déclencheur sur `auth.users`.
   - Fonction de sécurité `is_moderator()`.
   - Politiques de sécurité au niveau des lignes (RLS) pour la modération et la lecture publique.
   - Colonne géographique `location` et fonction RPC `nearby_reports`.
3. **`003_submission_guard.sql`** :
   - Création de la table `submission_log` (audit et limitation de débit).
   - Index composite sur `(ip_hash, created_at DESC)`.
   - RLS sur `submission_log` (aucun accès public).
   - **Révocation de l'insertion directe** pour les rôles `anon` et `authenticated` :
     ```sql
     REVOKE INSERT ON public.reports FROM anon, authenticated;
     ```

---

## 5. Checklist Post-Déploiement

Une fois le déploiement terminé sur Vercel, validez la liste de contrôle suivante :

- [ ] **Sonde de santé** :
  ```bash
  curl -I https://votre-app.vercel.app/api/health
  # Réponse attendue : HTTP 200 OK avec payload { "data": { "status": "ok", ... } }
  ```
- [ ] **En-têtes de sécurité** :
  Vérifiez que les en-têtes HTTP de sécurité sont présents :
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy-Report-Only` (ou CSP active)
- [ ] **Cartographie interactive** :
  Accédez à la page d'accueil et assurez-vous que les tuiles OpenStreetMap et les marqueurs se chargent correctement sans erreur CSP dans la console navigateur.
- [ ] **Création d'un signalement** :
  Sélectionnez un point sur la carte, remplissez le formulaire citoyen et validez. Vérifiez qu'il apparaît avec le statut `en_attente`.
- [ ] **Limitation de débit (Anti-Spam)** :
  Effectuez 6 soumissions rapprochées depuis la même adresse IP ; la 6ᵉ doit être rejetée avec le code HTTP **429 Too Many Requests** et l'en-tête `Retry-After: 600`.
- [ ] **Protection d'insertion directe Supabase** :
  Toute tentative d'insertion directe via le client JS public `supabase.from('reports').insert(...)` doit échouer en vertu de la révocation SQL de la migration 003.
- [ ] **Modération sécurisée** :
  Accédez à `/moderation` en étant déconnecté ou connecté en tant que citoyen simple : l'accès doit être refusé ou redirigé avec le message adéquat.
- [ ] **Page 404 conviviale** :
  Visitez `/une-page-inexistante` et confirmez l'affichage de la page 404 en français avec bouton de retour.

---

## 6. Procédure de Rotation des Clés en Cas de Fuite

En cas de compromission accidentelle d'une clé (particulièrement `SUPABASE_SERVICE_ROLE_KEY`) :

1. **Régénérer immédiatement la clé sur Supabase** :
   - Rendez-vous sur Supabase : **Project Settings > API**.
   - Sous **Project API keys**, cliquez sur **Generate new secret API key** pour `service_role`.
   - Copiez immédiatement la nouvelle clé.
2. **Mettre à jour les variables dans Vercel** :
   - Rendez-vous sur Vercel : **Project Settings > Environment Variables**.
   - Modifiez `SUPABASE_SERVICE_ROLE_KEY` avec la nouvelle valeur.
   - (Optionnel) Modifiez également `RATE_LIMIT_SALT` par une nouvelle chaîne aléatoire.
3. **Redéployer instantanément** :
   - Allez dans **Deployments**, sélectionnez le dernier déploiement et cliquez sur les trois points `... > Redeploy`.
   - Cochez **Use existing Build Cache** ou lancez un redéploiement complet pour propager immédiatement les nouvelles variables.
4. **Vérifier les logs d'audit** :
   - Dans Supabase, inspectez les requêtes récentes pour identifier d'éventuelles écritures illégitimes pendant la fenêtre de compromission.
