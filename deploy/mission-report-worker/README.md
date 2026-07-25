# Mission Report Worker (GCS) — setup manuel console GCP

Rien à versionner ici : ce module n'a pas de script `gcloud`, tout se fait à la main dans la console GCP, comme pour le `broker`. Ce document décrit la procédure à suivre une seule fois (projet `doggo-502614`, région `europe-west1`) pour préparer le bucket et les deux service-accounts dont dépendent le Worker (écriture) et le Backend (lecture + signature d'URL).

Fichiers **versionnés** : `docker-compose.yml` (service `worker`), `worker/.gitignore`.
**Générés à la main / téléchargés depuis la console** (jamais commités, déjà gitignorés) : les clés JSON des deux service-accounts (`worker-secrets/gcs-worker-key.json` en local, et le contenu brut collé dans `GCS_SERVICE_ACCOUNT_KEY` pour le Backend).

## 1. Créer le bucket GCS

Console GCP → **Cloud Storage** → **Créer un bucket** :

- Nom : `doggo-mission-reports`
- Région : `europe-west1`
- Classe de stockage : Standard
- Contrôle d'accès : accès uniforme au niveau du bucket
- Accès public : aucun (laisser la protection contre l'accès public activée)

## 2. Créer le service-account du Worker (écriture seule)

Console GCP → **IAM & Admin** → **Comptes de service** → **Créer un compte de service** :

- Nom : `mission-report-worker`
- Rôle : **Storage Object Creator**, accordé sur le bucket `doggo-mission-reports` uniquement — soit via l'onglet **Autorisations** du bucket (Cloud Storage → `doggo-mission-reports` → Autorisations → Accorder l'accès), soit au niveau projet avec une condition IAM restreignant la ressource à ce bucket. Ne pas accorder ce rôle au niveau projet sans condition.

Générer une clé JSON pour ce compte (onglet **Clés** → **Ajouter une clé** → JSON) et la télécharger. Ce fichier ne doit **jamais** être commité :

- En local : le placer dans `worker-secrets/gcs-worker-key.json` à la racine du repo (chemin monté par le service `worker` du `docker-compose.yml`, voir plus bas). Ce dossier est gitignoré.
- En prod : la clé est injectée au conteneur du Worker par un secret monté sur la plateforme cible (hors périmètre de ce document — se référer au déploiement du Worker lui-même).

## 3. Créer le service-account du Backend (lecture + signature d'URL)

Même procédure que l'étape 2 :

- Nom : `mission-report-backend`
- Rôle : **Storage Object Viewer**, sur le même bucket `doggo-mission-reports` (mêmes précautions que ci-dessus : accès scoping au bucket, pas au projet entier).

Générer une clé JSON pour ce compte. Son contenu (le JSON brut, pas un chemin de fichier) devient la valeur de la variable d'environnement `GCS_SERVICE_ACCOUNT_KEY` côté Backend — même pattern que `FIREBASE_SERVICE_ACCOUNT_KEYS` :

- En local : coller le JSON brut dans `.env` (`GCS_SERVICE_ACCOUNT_KEY=...`), voir `.env.example`.
- En prod (Cloud Run) : stocker via Secret Manager et l'exposer en variable d'environnement au service, comme c'est déjà fait pour `FIREBASE_SERVICE_ACCOUNT_KEYS`.

Le nom du bucket est fourni séparément via `GCS_BUCKET_NAME` (déjà présent dans `.env.example` avec la valeur `doggo-mission-reports`).

## 4. Où branchent les clés

| Variable | Côté | Valeur | Où |
|---|---|---|---|
| `GCS_BUCKET_NAME` | Backend | `doggo-mission-reports` | `.env` (local) / Cloud Run env (prod) |
| `GCS_SERVICE_ACCOUNT_KEY` | Backend | JSON brut de la clé `mission-report-backend` | `.env` (local) / Secret Manager (prod) |
| `GCS_BUCKET_NAME` | Worker | `doggo-mission-reports` | `docker-compose.yml` (déjà renseigné) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Worker | `/secrets/gcs-worker-key.json` | `docker-compose.yml`, monté depuis `worker-secrets/gcs-worker-key.json` (voir étape 2) |

## 5. Démarrer le Worker en local

Une fois les deux clés générées (étapes 2 et 3) et `worker-secrets/gcs-worker-key.json` en place :

```bash
docker compose up -d --build
docker compose ps
```

`rabbitmq`, `worker`, `postgres`, `redis`, `mosquitto` doivent tous apparaître `Up`/`healthy`. Déclencher une mission réelle jusqu'à `SUCCESS` et vérifier dans `docker compose logs worker` que le message est bien consommé et qu'une réponse part vers le Backend.
