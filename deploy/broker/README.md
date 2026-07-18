# Broker Doggo (Mosquitto + Redis) — déploiement VM

Fichiers **versionnés** : `docker-compose.yml`, `mosquitto/mosquitto.conf`, `mosquitto/aclfile`.
**Générés sur la VM** (jamais commités, déjà gitignorés) : `mosquitto/passwordfile`, `mosquitto/certs/`, `.env`.

Topologie : le backend (Cloud Run) parle au broker en `1883` **privé** via le VPC (`MQTT_USE_TLS=false`) ; les robots se connectent en `8883` **TLS** depuis Internet. Redis est privé (`6379`), protégé par `requirepass`. Seul `8883` est ouvert au monde par le firewall.

## 1. Générer la CA + le certificat serveur (IP SAN)

`BROKER_PUBLIC_IP` = l'IP publique statique de la VM. Le SAN doit contenir cette IP, sinon la validation TLS côté robot échoue.

```bash
cd mosquitto && mkdir -p certs && cd certs
openssl req -new -x509 -days 3650 -keyout ca.key -out ca.crt -nodes -subj "/CN=Doggo-CA"
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=doggo-broker"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 3650 \
  -extfile <(printf "subjectAltName=IP:%s" "$BROKER_PUBLIC_IP")
# vérifier :
openssl x509 -in server.crt -noout -text | grep -A1 "Subject Alternative Name"
```

`ca.crt` est le **seul** fichier à livrer au dev firmware.

## 2. Générer le passwordfile (user backend + robots)

```bash
# user backend (le -c crée le fichier) :
docker run --rm -v "$PWD/mosquitto:/m" eclipse-mosquitto:2 \
  mosquitto_passwd -b -c /m/passwordfile doggo-backend "$MQTT_BACKEND_PASSWORD"
# un robot (username = son dogId) :
docker run --rm -v "$PWD/mosquitto:/m" eclipse-mosquitto:2 \
  mosquitto_passwd -b /m/passwordfile "$DOG_ID" "$ROBOT_PASSWORD"
```

## 3. Démarrer

```bash
echo "REDIS_PASSWORD=$REDIS_PASSWORD" > .env
docker compose up -d
docker compose ps
```
