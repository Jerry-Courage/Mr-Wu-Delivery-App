# Build stage
FROM node:20 AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 and other native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
# This will build both the frontend (via vite) and the server (via tsc)
RUN npm run build

# Runtime stage
FROM node:20 AS runner

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled server and frontend assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/package.json ./package.json

# Copy diagnostic script
COPY diagnostic.sh ./
RUN chmod +x diagnostic.sh

# Install only production dependencies (better-sqlite3 must be installed here)
RUN npm install --omit=dev --no-audit --no-fund

# Initial database and public assets
COPY --from=builder /app/sqlite_v2.db ./sqlite_v2.db
COPY --from=builder /app/public/assets ./public/assets

# Ensure uploads directory exists and set permissions
RUN mkdir -p public/uploads

# CRITICAL: Set full permissions on everything to ensure write access and execution
RUN chmod -R 777 .

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start using the diagnostic entrypoint script
# This script will log the environment and file list before starting the server
ENTRYPOINT ["sh", "/app/diagnostic.sh"]
