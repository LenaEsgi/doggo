# Runbook — Activation de l'authentification/TLS du broker MQTT

> Ce runbook active la sécurisation du broker préparée par la tâche 12 de la remédiation d'audit
> (`security(mqtt): authenticated broker …`). Les changements de code/config sont déjà en place et
> **rétro-compatibles** : tant que ce runbook n'est pas exécuté, le backend se connecte en anonyme
> (`mqtt://`) exactement comme avant. Ces étapes manipulent des **secrets** et **redémarrent** le
> broker — à exécuter par un opérateur, jamais committées.

## ⚠️ Ordre impératif
Le `docker-compose.yml` monte désormais `mosquitto/passwordfile` et `mosquitto/certs/`, et
`mosquitto.conf` a `allow_anonymous false`. **Ne recréez PAS le conteneur `mosquitto` avant d'avoir
généré le fichier de mots de passe** (étape 1), sinon Docker crée un répertoire vide à la place du
fichier et le broker part en crash-loop.

## 1. Générer le fichier de mots de passe (obligatoire)
Un compte pour le backend + un compte par robot. Depuis `backend/` :

```bash
touch mosquitto/passwordfile
# compte backend
docker run --rm -v "$PWD/mosquitto:/m" eclipse-mosquitto:2 \
  mosquitto_passwd -b /m/passwordfile doggo-backend '<MOT_DE_PASSE_BACKEND>'
# un compte par robot (username = id du robot, pour l'ACL pattern robot/%u/#)
docker run --rm -v "$PWD/mosquitto:/m" eclipse-mosquitto:2 \
  mosquitto_passwd -b /m/passwordfile '<ROBOT_ID>' '<MOT_DE_PASSE_ROBOT>'
```

`mosquitto/passwordfile` et `mosquitto/certs/` sont déjà dans `.gitignore` — ne les committez pas.

## 2. (Production TLS uniquement) Déposer les certificats
Placez `ca.crt`, `server.crt`, `server.key` dans `backend/mosquitto/certs/`. Pour un labo isolé sans
TLS, sautez cette étape et laissez `MQTT_USE_TLS=false` (le listener 1883 authentifié suffit).

## 3. Renseigner le `.env` du backend
Dans `backend/.env` (jamais dans `.env.example`) :

```dotenv
MQTT_USERNAME=doggo-backend
MQTT_PASSWORD=<MOT_DE_PASSE_BACKEND>
# Pour TLS (prod) :
# MQTT_PORT=8883
# MQTT_USE_TLS=true
# MQTT_CA_PATH=/chemin/absolu/vers/ca.crt
```

## 4. Recréer le broker puis redémarrer le backend
```bash
cd backend
docker compose up -d --force-recreate mosquitto
docker logs robot_dog_mqtt --tail 30    # doit démarrer sans erreur (listeners 1883 + 8883)
# redémarrez ensuite le backend pour qu'il se connecte avec les identifiants
```

## 5. Vérifier
```bash
# publication anonyme -> REFUSÉE
docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_pub -h 127.0.0.1 -p 1883 -t 'robot/x/command' -m '{}' ; echo "exit=$?"   # attendu: échec
# publication authentifiée -> OK
docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_pub -h 127.0.0.1 -p 1883 -u doggo-backend -P '<MOT_DE_PASSE_BACKEND>' \
  -t 'robot/x/command' -m '{}' ; echo "exit=$?"                                      # attendu: 0
```
Côté backend, le log `MqttService: connected to broker` doit apparaître (`tls: true` en TLS).

## Rollback
Repasser `allow_anonymous true` dans `mosquitto.conf`, `docker compose up -d --force-recreate
mosquitto`, et vider `MQTT_USERNAME`/`MQTT_PASSWORD` dans `.env`. Le code reste fonctionnel en anonyme.

---

# Caveat de déploiement — migration « un run actif par robot »

La migration `…_create_add_unique_active_run_per_dog_indices_table` crée un **index unique partiel**
`one_active_run_per_dog` sur `mission_runs (robot_dog_id) WHERE status IN ('PENDING','RUNNING')`.

Si la base de **production** contient déjà **deux runs actifs pour un même robot** (le bug de course
que cette migration corrige, donc plausible historiquement), la création de l'index **échouera**.
Avant de migrer la prod, exécuter le contrôle pré-vol :

```sql
SELECT robot_dog_id, count(*)
FROM mission_runs
WHERE status IN ('PENDING','RUNNING')
GROUP BY robot_dog_id
HAVING count(*) > 1;
```
Si des lignes remontent, résoudre les doublons (clore les runs actifs surnuméraires en état terminal)
avant d'appliquer la migration.
