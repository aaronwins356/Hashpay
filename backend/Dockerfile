FROM node:20-alpine AS deps

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY .eslintrc.json ./
COPY .prettierrc ./
COPY src ./src
COPY config ./config
COPY scripts ./scripts

RUN npm run build

FROM node:20-alpine AS production
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=deps /usr/src/app/package*.json ./
COPY --from=deps /usr/src/app/node_modules ./node_modules
RUN npm prune --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/scripts ./scripts

ENTRYPOINT ["/usr/src/app/scripts/start-with-migrations.sh"]
