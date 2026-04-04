# Build stage
FROM node:20-slim AS builder

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
RUN npm run build

# Runtime stage
FROM node:20-slim AS runner

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

# Copy build artifacts and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/sqlite_v2.db ./sqlite_v2.db

# Ensure uploads directory exists
RUN mkdir -p public/uploads

# Set environment to production
ENV NODE_ENV=production
ENV SERVER_PORT=3001

EXPOSE 3001

# Start the server using tsx (as it's in the dependencies list)
CMD ["npx", "tsx", "server/index.ts"]
