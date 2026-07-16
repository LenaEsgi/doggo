FROM node:25-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM node:25-alpine
WORKDIR /app
COPY --from=builder /app/build ./
RUN npm ci --omit=dev
COPY swagger.yml .
EXPOSE 3333
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
