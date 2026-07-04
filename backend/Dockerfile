# Multi-stage build for a small, production-ready image

FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate
COPY --from=builder /app/dist ./dist

EXPOSE 4000
# Run pending migrations, then start the server. Safe to run on every
# deploy: Prisma only applies migrations that haven't run yet.
CMD npx prisma migrate deploy && node dist/index.js
