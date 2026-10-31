# ==============================================================================
# Multi-stage Dockerfile for Google Cloud Run / Cloud Build
# Builds Vite + React frontend and serves fullstack app via Express on $PORT
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the Frontend
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source files & configs
COPY index.html vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# Frontend build arguments (defaults to live backend mode for Cloud serving)
ARG VITE_USE_MOCK=false
ARG VITE_API_BASE_URL=/api
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build client production assets into /app/dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Install ca-certificates and curl for health checks & SSL connectivity
RUN apk --no-cache add ca-certificates curl wget

ENV NODE_ENV=production
ENV PORT=8080
ENV CLIENT_DIST=/app/dist

# Install production dependencies for the Express backend
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy backend application source code
COPY server/ ./server/

# Ensure Let's Encrypt ISRG Root X1 CA cert is available for TiDB Cloud / SSL connections
RUN mkdir -p /app/server/certs && \
    (wget -qO /app/server/certs/isrgrootx1.pem https://letsencrypt.org/certs/isrgrootx1.pem || true)

# Copy prebuilt frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Adjust ownership to node user
RUN chown -R node:node /app

# Switch to non-root user for container security
USER node

# Expose default Cloud Run port
EXPOSE 8080

# Cloud Run health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start fullstack server
CMD ["node", "server/index.js"]

