FROM node:20-alpine AS builder
# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo configuration files
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/server/package.json ./apps/server/

# Copy lockfile and fetch packages
COPY pnpm-lock.yaml ./
RUN pnpm fetch

# Copy the rest of the source code
COPY . .

# Install dependencies (offline)
RUN pnpm install --offline --frozen-lockfile

# Build the server and db packages
RUN pnpm run build --filter=@signal/server --filter=@signal/db

FROM node:20-alpine AS runner
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package info
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/server/package.json ./apps/server/
COPY pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from the builder stage
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

WORKDIR /app/apps/server
EXPOSE 4000

# Start the server
CMD ["node", "dist/index.js"]
