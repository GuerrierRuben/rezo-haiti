# Protocole de Tests Manuels — Rezo Ayiti

Ce document présente la checklist exhaustive des scénarios de test pour valider les fonctionnalités, la robustesse géographique et la sécurité niveau ligne (RLS) de la plateforme **Rezo Ayiti**.

---

## 📋 Matrice des Scénarios de Test

| N° | Scénario | Rôle testé | Résultat attendu | Statut |
| :--- | :--- | :--- | :--- | :--- |
| **T1** | Publication d'un signalement citoyen | Visiteur anonyme | Formulaire validé, coordonnées enregistrées, statut `en_attente`. | Prêt |
| **T2** | Visibilité publique & Sécurité RLS | Visiteur anonyme | Seuls les signalements `valide` apparaissent sur la carte et la liste. | Prêt |
| **T3** | Contrôle territorial hors d'Haïti | Tous | Clic hors frontières rejeté (message d'erreur rouge, pas d'envoi). | Prêt |
| **T4** | Tentative d'accès non autorisé | Utilisateur `citoyen` | Écran de blocage rouge, aucune donnée de modération accessible. | Prêt |
| **T5** | Modération et validation de statut | Utilisateur `moderateur` | Statut mis à jour, feedback vert inline, synchronisation immédiate. | Prêt |
| **T6** | Protection contre les failles XSS | Tous | Balises HTML neutralisées en texte brut dans l'ensemble de l'UI. | Prêt |

---

## 🧪 Détail des Procédures de Test

### Test 1 : Publication d'un signalement citoyen
1. Démarrer l'application : `npm run dev` et ouvrir `http://localhost:3000`.
2. Survoler la carte : vérifier que le curseur prend l'apparence d'une croix (`crosshair`).
3. Cliquer sur un emplacement en Haïti (ex: Port-au-Prince, lat ~18.539, lng ~-72.335) :
   - Une épingle rouge animée (`📍` avec pulsation) apparaît sur la carte à l'endroit cliqué.
   - Le bloc de position dans le formulaire passe au vert avec les coordonnées au format `Lat: 18.539XX • Lng: -72.335XX`.
4. Remplir le formulaire :
   - **Titre :** `Caniveau bouché Avenue John Brown`
   - **Catégorie :** `Route`
   - **Description :** `Obstruction majeure provoquant des inondations lors des fortes pluies.`
5. Cliquer sur **« Soumettre le signalement »** :
   - Le bouton affiche un indicateur de chargement (`Envoi en cours...`).
   - Le formulaire est réinitialisé et le repère temporaire est retiré de la carte.
   - Un bandeau vert confirme l'envoi : *« Signalement envoyé, il apparaîtra sur la carte après validation par un modérateur. »*

---

### Test 2 : Visibilité publique & Respect des politiques RLS
1. Rester sur la page d'accueil en tant que visiteur anonyme (déconnecté).
2. Observer la liste des « Signalements récents » et les marqueurs sur la carte.
3. **Vérification :** Le signalement créé au test 1 ne doit **PAS** être visible publiquement tant qu'il a le statut `en_attente`.
4. Consulter Supabase (**Table Editor > reports**) :
   - La ligne correspondante existe bien en base avec `status = 'en_attente'` et la colonne PostGIS `location` calculée automatiquement.

---

### Test 3 : Délimitation territoriale (Bounding Box Haïti)
1. Cliquer sur la carte en dehors des frontières d'Haïti (par exemple dans les eaux caribéennes ou en République Dominicaine, lat `18.5`, lng `-70.5`).
2. **Vérification :**
   - Aucun marqueur temporaire n'est créé.
   - Le formulaire reste en état d'attente ambré.
   - Un message d'erreur rouge apparaît : *« La position sélectionnée est en dehors des limites d'Haïti (lat 17.9 à 20.2, lng -74.6 à -71.6). »*
3. Tenter d'envoyer le formulaire sans position :
   - Un message d'erreur s'affiche sous le champ : *« Veuillez sélectionner un emplacement sur la carte en cliquant dessus. »*

---

### Test 4 : Contrôle d'accès Citoyen sur l'Espace Modération
1. Créer un compte classique dans Supabase (**Authentication > Users**) avec un email `citoyen@test.org`.
2. Par défaut, le trigger SQL lui attribue le rôle `citoyen` dans la table `profiles`.
3. Naviguer vers `http://localhost:3000/moderation`.
4. Se connecter avec les identifiants de `citoyen@test.org`.
5. **Vérification :**
   - L'écran affiche un panneau d'interdiction : **« Accès réservé aux modérateurs »**.
   - Le texte précise que le rôle Citoyen ne possède pas les droits de modération.
   - **Aucune donnée de signalement n'est chargée ni affichée** (garanti par le front et par la RLS).
   - Un bouton « Se déconnecter » permet de fermer la session.

---

### Test 5 : Cycle de modération par un compte Modérateur
1. Dans la console Supabase (**Table Editor > profiles**), modifier le rôle de l'utilisateur de test pour `moderateur` ou `admin`.
2. Se connecter sur `http://localhost:3000/moderation`.
3. **Vérification de l'interface :**
   - Le tableau de bord de modération s'affiche avec le badge de rôle approprié.
   - Les compteurs statistiques par statut reflètent l'ensemble des signalements (`Total`, `En attente`, `Validés`, `Résolus`).
   - Le signalement `en_attente` créé au test 1 est bien listé.
4. Dans le sélecteur de statut de la ligne, choisir **« ✅ Valider (rendre public) »** :
   - Un indicateur rotatif s'affiche pendant la requête.
   - Un message inline vert confirme : *« Statut mis à jour avec succès : « valide ». »*
   - Les compteurs se mettent à jour automatiquement.
5. Ouvrir la page publique (`http://localhost:3000`) dans un autre onglet :
   - Le signalement apparaît désormais sous forme de marqueur cliquable sur la carte Leaflet.
   - Le signalement est listé dans la section « Signalements récents ».

---

### Test 6 : Résistance aux attaques par injection XSS
1. Sur la page d'accueil, soumettre un signalement avec un contenu malveillant :
   - **Titre :** `<script>alert('XSS')</script><b>Test Titre</b>`
   - **Description :** `<img src=x onerror="alert('XSS')"><b>Description en gras</b>`
2. Aller dans l'espace modération et valider le signalement.
3. Inspecter le rendu sur la page d'accueil (`/`) et dans la modération (`/moderation`) :
   - Les balises `<script>`, `<b>`, `<img>` ne doivent en aucun cas être exécutées ou interprétées.
   - Elles doivent s'afficher fidèlement sous forme de texte brut échappé.
4. Cliquer sur le marqueur sur la carte :
   - Le popup Leaflet affiche également le texte brut sans interprétation HTML (sécurisé via `textContent` et l'API DOM native).
