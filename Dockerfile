# Multi-stage Dockerfile for JEmby Web App
# Optimized for CasaOS, Docker, and lightweight home servers

# Stage 1: Lightweight build stage
FROM node:22-alpine AS builder

WORKDIR /app

ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV HUSKY=0
ENV CI=1

# Copy dependency files
COPY package.json package-lock.json* bun.lock* ./

# Remove desktop-only Electron tools before install
RUN npm pkg delete devDependencies.electron devDependencies.electron-builder devDependencies.wait-on devDependencies.concurrently

# Install build dependencies
RUN npm install --ignore-scripts --no-audit --no-fund

# Copy application source
COPY . .

# Build Vite static assets and compiled server.js
RUN npm run build

# Stage 2: High-performance runtime with Node.js & Express server
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80
ENV DATA_DIR=/app/data

# Copy dependencies
COPY package.json package-lock.json* bun.lock* ./
RUN npm pkg delete devDependencies.electron devDependencies.electron-builder devDependencies.wait-on devDependencies.concurrently
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

# Copy compiled build artifacts (SPA + server.js)
COPY --from=builder /app/dist ./dist

# Create data directory for volume mounting (/DATA/AppData/RvEmby -> /app/data)
RUN mkdir -p /app/data

EXPOSE 80
EXPOSE 3000

CMD ["node", "dist/server.js"]
