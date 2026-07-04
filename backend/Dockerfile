# Multi-stage build for a small, production-ready image

FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD npx prisma migrate deploy && node dist/index.js