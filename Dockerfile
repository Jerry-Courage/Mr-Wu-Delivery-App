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
# This will build both the frontend (via vite) and the server (via esbuild)
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

# Copy the bundled server and frontend assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server/index.cjs ./dist-server/index.cjs
COPY --from=builder /app/package.json ./package.json

# Install only production dependencies (better-sqlite3 must be installed here)
RUN npm install --omit=dev --no-audit --no-fund

# Initial database and public assets
COPY --from=builder /app/sqlite_v2.db ./sqlite_v2.db
COPY --from=builder /app/public/assets ./public/assets

# Ensure uploads directory exists and set permissions
RUN mkdir -p public/uploads

# CRITICAL: Set full permissions on the database and public folders
RUN chmod -R 777 .

# Set environment to production
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Start using the high-performance bundle
CMD ["node", "dist-server/index.cjs"]
