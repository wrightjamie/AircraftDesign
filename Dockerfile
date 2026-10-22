# ==========================================
# STAGE 1: Build & Verify Engine
# ==========================================
FROM node:24-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and run full automated aeronautical test suite
COPY . .
RUN npm test
RUN npm run build

# ==========================================
# STAGE 2: Lightweight Production Nginx Image
# ==========================================
FROM nginx:alpine-slim AS runner
WORKDIR /usr/share/nginx/html

# Clear default static files and copy Vite production dist
RUN rm -rf ./*
COPY --from=builder /app/dist .

# Custom Nginx configuration for SPA routing & compression
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
