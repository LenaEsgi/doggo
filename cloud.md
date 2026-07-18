# 1. Build et push de l'image Docker (obligatoire --platform sur Mac M1/M2)

docker buildx build --platform linux/amd64 \
-t europe-west1-docker.pkg.dev/doggo-491610/doggo/doggo:latest \
--push .

# 2. Ensuite dans la console GCP :

# Cloud Run → service "doggo" → Edit & Deploy New Revision → Deploy

npm run build
firebase deploy --only hosting

# lien : https://doggo-646a4.web.app/robots
