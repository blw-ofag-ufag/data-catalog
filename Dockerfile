FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Served from the container root, so the app is built with the root base href rather than
# the /data-catalog/ one GitHub Pages needs.
RUN npm run prebuild && npm run build:prod-root

FROM nginx:alpine

# Angular uses hash routing, so nginx needs no history fallback.
COPY --from=builder /usr/src/app/dist/DigiAgriFoodDB/ /usr/share/nginx/html
