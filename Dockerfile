# Multi-stage Dockerfile for AYK MAIN 8686 Full-Stack Container (Google Cloud Run / Render)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy full source and build client + server bundle
COPY . .
RUN npm run build

# Production Runner Image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built distribution bundles
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Run full-stack Express server (serves Vite client + handles Gemini and PP APIs)
CMD ["node", "dist/server.cjs"]
