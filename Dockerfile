# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Build the application
RUN npm run build

# ============================================
# Stage 2: Build Backend
# ============================================
FROM golang:1.24-alpine AS backend-builder

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

WORKDIR /app/backend

# Copy go mod files
COPY backend/go.mod backend/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY backend/ .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o server ./cmd/server

# ============================================
# Stage 3: Runtime
# ============================================
FROM alpine:3.19

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata nginx supervisor

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/backend/server ./server

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy supervisor config
COPY supervisord.conf /etc/supervisord.conf

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port (nginx serves both frontend and proxies to backend)
EXPOSE 5678

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5678/health || exit 1

# Start supervisor (manages both nginx and backend)
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
