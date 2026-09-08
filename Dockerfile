FROM node:22-alpine AS build

WORKDIR /workspace
ENV NUXT_TELEMETRY_DISABLED=1 HUSKY=0

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY backend/prisma backend/prisma
COPY backend/prisma.config.ts backend/prisma.config.ts
RUN npm ci && npm --prefix backend run prisma:generate

COPY app app
COPY backend/src backend/src
COPY i18n i18n
COPY public public
COPY nuxt.config.ts tsconfig.json ./
RUN npx nuxt prepare && npm run build

FROM nginx:1.27-alpine

# `nginx.conf` est rendu au démarrage par l'entrypoint officiel nginx :
# API_HOST reste `api` sous Compose et prend le DNS privé Railway en production.
ENV API_HOST=api
# Active la découverte DNS à l'exécution : l'adresse privée Railway de l'API
# peut changer à chaque redéploiement sans que le front ait à être relancé.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=on
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/.output/public /usr/share/nginx/html

EXPOSE 80
