FROM node:20-alpine AS base

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json .
COPY .eslintrc.json .
COPY .prettierrc .
COPY src ./src
COPY config ./config

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /usr/src/app
COPY --from=base /usr/src/app/package.json ./
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/dist ./dist
COPY --from=base /usr/src/app/config ./config

ENV NODE_ENV=production
CMD ["node", "dist/src/server.js"]
