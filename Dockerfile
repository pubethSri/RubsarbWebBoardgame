# Stage 1: Build Frontend
FROM oven/bun:1 AS builder

# Set working directory validation
WORKDIR /app/client

# Copy package files first for caching
COPY client/package.json client/bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY client .

# Build the frontend (Output: dist/)
RUN bun run build

# Stage 2: Production Server
FROM oven/bun:1

WORKDIR /app/server

# Copy server package files
COPY server/package.json server/bun.lock ./

# Install ONLY production dependencies
RUN bun install --frozen-lockfile --production

# Copy server source code
COPY server .

# Copy built frontend assets from Stage 1
COPY --from=builder /app/client/dist ../client/dist

# Define environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Create volume mount point for SQLite
VOLUME /app/server/db

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "src/index.ts"]
