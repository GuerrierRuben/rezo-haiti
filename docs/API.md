# Documentation de l'API REST Rezo Ayiti 🇭🇹

> API HTTP pour le signalement, la modération, la cartographie spatiale PostGIS et la gestion des utilisateurs de la plateforme **Rezo Ayiti**.

---

## 🔒 Principes d'Authentification et Sécurité (RLS)

L'API Rezo Ayiti applique une sécurité native de bout en bout grâce à la **Row Level Security (RLS)** de PostgreSQL/Supabase :
- **Requêtes Publiques (Anonymes) :** Ne nécessitent aucun en-tête d'authentification. Elles ne peuvent consulter que les signalements au statut `valide` et créer de nouveaux signalements (dont le statut sera obligatoirement `en_attente`).
- **Requêtes Authentifiées :** Doivent transmettre le token JWT de session dans l'en-tête HTTP :
  ```http
  Authorization: Bearer <votre_token_jwt_supabase>
  ```
- **Rôles Système :**
  - `citoyen` : rôle par défaut. Peut consulter les signalements validés, créer des signalements, voir ses propres signalements (même en attente) et modifier son profil personnel (`display_name`).
  - `moderateur` : peut consulter tous les signalements quel que soit leur statut, valider/rejeter/résoudre des signalements (`PATCH /api/reports/:id`), éditer et supprimer des signalements.
  - `admin` : tous les droits modérateur + consultation de la liste de tous les utilisateurs (`GET /api/users`).

---

## 📐 Format Standard des Réponses

### Succès
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

### Erreur
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données de signalement non conformes.",
    "details": { ... }
  }
}
```

Codes HTTP utilisés :
- `200 OK` : Succès de lecture ou de mise à jour.
- `201 Created` : Création réussie d'une ressource.
- `400 Bad Request` : Paramètres de requête invalides ou JSON malformé.
- `401 Unauthorized` : Token manquant ou expiré.
- `403 Forbidden` : Rôle insuffisant (`moderateur` ou `admin` requis).
- `404 Not Found` : Ressource introuvable ou masquée par la RLS.
- `422 Unprocessable Entity` : Échec de validation Zod (champs hors limites, coordonnées hors Haïti).
- `500 Internal Server Error` : Erreur interne (messages génériques sans fuite SQL).

---

## 📍 Boîte Englobante d'Haïti (Bounding Box)

Toutes les coordonnées géographiques transmises sont validées par Zod selon les bornes officielles d'Haïti :
- **Latitude :** entre `17.9` et `20.2`
- **Longitude :** entre `-74.6` et `-71.6`

---

## 🛣️ Endpoints Signalements (`/api/reports`)

### 1. Liste paginée des signalements
- **Méthode :** `GET`
- **URL :** `/api/reports`
- **Authentification :** Optionnelle. Les anonymes ne voient que `status = 'valide'`.
- **Paramètres de requête (Query Params) :**
  - `page` *(number, optionnel, défaut : 1)* : Numéro de la page.
  - `limit` *(number, optionnel, défaut : 20, max : 100)* : Nombre de résultats par page.
  - `category` *(string, optionnel)* : `'eau'`, `'electricite'`, `'route'`, `'sante'`.
  - `status` *(string, optionnel)* : `'en_attente'`, `'valide'`, `'resolu'`.
  - `q` *(string, optionnel)* : Recherche textuelle dans le titre ou la description.
  - `bbox` *(string, optionnel)* : Boîte englobante au format `minLng,minLat,maxLng,maxLat`.
  - `order` *(string, optionnel, défaut : 'desc')* : `'asc'` ou `'desc'`.

**Exemple curl :**
```bash
curl -X GET "http://localhost:3000/api/reports?category=eau&page=1&limit=10"
```

---

### 2. Créer un signalement
- **Méthode :** `POST`
- **URL :** `/api/reports`
- **Authentification :** Optionnelle. Si connecté, `user_id` est automatiquement assigné à l'auteur. Le statut initial est obligatoirement forcé à `'en_attente'`.
- **Corps de la requête (JSON) :**
  ```json
  {
    "title": "Coupure d'eau potable",
    "description": "Le tuyau principal alimentant le quartier est endommagé depuis 48h.",
    "category": "eau",
    "latitude": 18.5392,
    "longitude": -72.335
  }
  ```

**Exemple curl :**
```bash
curl -X POST "http://localhost:3000/api/reports" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Coupure d eau potable",
    "description": "Le tuyau principal alimentant le quartier est endommagé depuis 48h.",
    "category": "eau",
    "latitude": 18.5392,
    "longitude": -72.3350
  }'
```

---

### 3. Consulter un signalement par ID
- **Méthode :** `GET`
- **URL :** `/api/reports/:id`
- **Authentification :** Optionnelle (accessible si validé, ou si l'utilisateur est l'auteur ou modérateur/admin).

**Exemple curl :**
```bash
curl -X GET "http://localhost:3000/api/reports/a218f29d-4081-4be3-bd4f-a9ec796696db"
```

---

### 4. Modérer ou modifier un signalement
- **Méthode :** `PATCH`
- **URL :** `/api/reports/:id`
- **Authentification :** Requise (`moderateur` ou `admin`).
- **Corps de la requête (JSON) :**
  ```json
  {
    "status": "valide"
  }
  ```

**Exemple curl :**
```bash
curl -X PATCH "http://localhost:3000/api/reports/a218f29d-4081-4be3-bd4f-a9ec796696db" \
  -H "Authorization: Bearer <TOKEN_MODERATEUR>" \
  -H "Content-Type: application/json" \
  -d '{"status": "valide"}'
```

---

### 5. Supprimer un signalement
- **Méthode :** `DELETE`
- **URL :** `/api/reports/:id`
- **Authentification :** Requise (`moderateur` ou `admin`).

**Exemple curl :**
```bash
curl -X DELETE "http://localhost:3000/api/reports/a218f29d-4081-4be3-bd4f-a9ec796696db" \
  -H "Authorization: Bearer <TOKEN_MODERATEUR>"
```

---

### 6. Recherche géographique de proximité (`/nearby`)
- **Méthode :** `GET`
- **URL :** `/api/reports/nearby`
- **Authentification :** Optionnelle.
- **Paramètres de requête :**
  - `lat` *(number, requis)* : Latitude du point central.
  - `lng` *(number, requis)* : Longitude du point central.
  - `radius` *(number, optionnel, défaut : 5000, max : 50000)* : Rayon de recherche en mètres.

**Exemple curl :**
```bash
curl -X GET "http://localhost:3000/api/reports/nearby?lat=18.5392&lng=-72.3350&radius=10000"
```

---

## 👤 Endpoints Utilisateurs & Profils (`/api/users`)

### 7. Consulter son propre profil
- **Méthode :** `GET`
- **URL :** `/api/users/me`
- **Authentification :** Requise (tout utilisateur connecté).

**Exemple curl :**
```bash
curl -X GET "http://localhost:3000/api/users/me" \
  -H "Authorization: Bearer <TOKEN_UTILISATEUR>"
```

---

### 8. Mettre à jour son nom d'affichage
- **Méthode :** `PATCH`
- **URL :** `/api/users/me`
- **Authentification :** Requise (utilisateur connecté). Seul `display_name` peut être modifié ; le rôle est protégé et immuable.
- **Corps de la requête (JSON) :**
  ```json
  {
    "display_name": "Jean Baptiste"
  }
  ```

**Exemple curl :**
```bash
curl -X PATCH "http://localhost:3000/api/users/me" \
  -H "Authorization: Bearer <TOKEN_UTILISATEUR>" \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Jean Baptiste"}'
```

---

### 9. Liste des utilisateurs (Administration)
- **Méthode :** `GET`
- **URL :** `/api/users`
- **Authentification :** Requise (`admin` uniquement).
- **Paramètres de requête :**
  - `page` *(number, optionnel, défaut : 1)*
  - `limit` *(number, optionnel, défaut : 20, max : 100)*

**Exemple curl :**
```bash
curl -X GET "http://localhost:3000/api/users?page=1&limit=20" \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```
