FROM node:22-alpine AS build

WORKDIR /workspace
ENV HUSKY=0
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY backend/tsconfig.json backend/tsconfig.json
RUN npm ci

COPY backend/prisma backend/prisma
COPY backend/prisma.config.ts backend/prisma.config.ts
RUN npm --prefix backend run prisma:generate

COPY backend/src backend/src
RUN npm --prefix backend run build

FROM build AS migration
WORKDIR /workspace/backend
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/backend/dist ./dist
# Railway exécute `prisma migrate deploy` dans l'image runtime avant le
# démarrage. Les migrations et leur configuration doivent donc être présentes
# dans cette image, pas seulement dans le stage de build.
COPY --from=build /workspace/backend/prisma ./prisma
COPY --from=build /workspace/backend/prisma.config.ts ./prisma.config.ts

EXPOSE 3001
CMD ["node", "dist/index.js"]
