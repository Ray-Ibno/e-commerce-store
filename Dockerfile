FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./

RUN chown -R node:node /app

USER node

RUN npm ci --only=production

COPY --chown=node:node . .

EXPOSE 4005

CMD npx prisma generate && node backend/server.js