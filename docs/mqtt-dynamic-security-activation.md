# Activation Dynamic Security (Mosquitto) — dev puis prod

> À tester en dev en premier (fait le 2026-07-25). Rejouer ensuite les mêmes étapes sur le
> broker de prod. Le code (`mosquitto.conf`) doit déjà charger le plugin (voir plan Task 1)
> avant l'étape 1. Syntaxe `mosquitto_ctrl` vérifiée en dev le 2026-07-25 (mosquitto_ctrl
> 2.1.2) — les corrections ci-dessous remplacent les commandes devinées initialement.

## 1. Recréer le broker avec le plugin actif

```bash
cd backend   # ou backend/deploy/broker en prod
docker compose up -d --force-recreate mosquitto
```

## 2. Récupérer les identifiants admin générés automatiquement

Au premier démarrage, le plugin crée un fichier `dynamic-security.json` avec un compte
`admin` et un mot de passe aléatoire — **pas affiché dans les logs**, mais écrit dans un
fichier `.pw` à côté, à lire une seule fois puis à supprimer/ignorer ensuite :

```bash
docker exec robot_dog_mqtt cat /mosquitto/data/dynamic-security.json.pw
# admin <password généré>
```

## 3. Créer le rôle "robot" (accès à son propre topic uniquement)

```bash
ADMIN_PW='<password obtenu ci-dessus>'

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec createRole robot

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec addRoleACL robot publishClientSend "robot/%u/#" allow

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec addRoleACL robot publishClientReceive "robot/%u/#" allow

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec addRoleACL robot subscribePattern "robot/%u/#" allow
```

## 4. Recréer le compte backend dans Dynamic Security

Utiliser le même mot de passe que celui déjà en place dans `backend/.env` (`MQTT_PASSWORD`), pour ne rien changer côté backend.

Le compte backend a besoin de **deux rôles** : `dynsec-admin` (intégré à Mosquitto —
"Grants access to administer clients/groups/roles", pas `super-admin` qui contourne toutes
les ACL du broker) pour piloter le protocole de contrôle, **et** un rôle `backend` maison
donnant accès à `robot/#` — équivalent de la ligne `topic readwrite robot/#` de l'ancien
`aclfile` statique. Sans ce second rôle, `MqttServiceImplementation.connect()` échoue dès
l'abonnement aux topics `robot/+/telemetry` etc. (`ErrorWithSubackPacket: Subscribe error`),
avant même d'atteindre le protocole dynsec.

Attention : `-p` minuscule pour le mot de passe du **client créé** (`createClient`),
`-P` majuscule pour le mot de passe de **connexion** de `mosquitto_ctrl` — ce sont deux
choses différentes.

```bash
docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec createRole backend

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec addRoleACL backend publishClientSend "robot/#" allow

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec addRoleACL backend publishClientReceive "robot/#" allow

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec addRoleACL backend subscribePattern "robot/#" allow

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec addRoleACL backend unsubscribePattern "robot/#" allow

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec createClient doggo-backend -p '<MOT_DE_PASSE_DEJA_DANS_.ENV>'

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec addClientRole doggo-backend dynsec-admin

docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_ctrl -h 127.0.0.1 -p 1883 -u admin -P "$ADMIN_PW" \
  dynsec addClientRole doggo-backend backend
```

## 5. Vérifier

```bash
docker logs robot_dog_mqtt --tail 20   # pas d'erreur
# côté backend : le log "MqttService: connected to broker" doit apparaître
```

Créer un robot depuis le back-office admin : le backend doit répondre `201` avec un `mqtt.username`/`mqtt.password`, sans aucune action manuelle supplémentaire sur le serveur.

## Lancer les tests fonctionnels de `create-robot-dog`/`destroy-robot-dog` en local

En plus des étapes 1-4 ci-dessus, `backend/.env.test` doit avoir `MQTT_USERNAME=doggo-backend`
et `MQTT_PASSWORD=<mot de passe>` (absent par défaut). Le provider MQTT (`adonisrc.ts`) est
volontairement exclu de l'environnement `test` (`environment: ['web', 'console']`) — donc même
avec ces variables, `node ace test` ne provisionnera rien tant que ce n'est pas changé. C'est
une décision d'architecture à trancher (faut-il que toute la suite de tests dépende d'un
broker joignable, ou seulement les tests MQTT ?), pas quelque chose à modifier sans y réfléchir.

## Rollback

```bash
# repasser mosquitto.conf sur password_file/acl_file (git checkout du fichier précédent)
docker compose up -d --force-recreate mosquitto
```
