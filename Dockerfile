# Multi-stage Dockerfile for R_volution Player Web App
# Optimized for CasaOS, Docker, and lightweight home servers

# Stage 1: Lightweight build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Prevent Electron from downloading any binaries during web build
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
ENV HUSKY=0
ENV CI=1

# Copy dependency files
COPY package.json package-lock.json* bun.lock* ./

# Remove heavy desktop-only Electron tools before install so Raspberry Pi doesn't waste CPU/RAM downloading them
RUN npm pkg delete devDependencies.electron devDependencies.electron-builder devDependencies.wait-on devDependencies.concurrently

# Fast install: only the lightweight web build tools (Vite, React, Tailwind)
RUN npm install --ignore-scripts --no-audit --no-fund

# Copy application source
COPY . .

# Build Vite static assets
RUN npm run build

# Stage 2: Serve using high-performance Alpine Nginx
FROM nginx:alpine

# Copy custom Nginx config for SPA routing and video streaming
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '        index index.html index.htm;' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
