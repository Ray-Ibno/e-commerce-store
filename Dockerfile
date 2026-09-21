ARG RAILWAY_SERVICE_ID=""

# =====================================================
# STAGE 1: The Base
# =====================================================
FROM node:20-alpine AS base

# Activates pnpm with corepack
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

ARG RAILWAY_SERVICE_ID

# Create and move to a folder named /app inside this temporary container
WORKDIR /app

# Copy the workspace blueprint
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/

# Fetch all the dependencies across the workspace using pnpm's store isolation rules
RUN --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ==========================================
# STAGE 2: The Development Builder
# ==========================================
FROM base AS dev-builder
WORKDIR /app
COPY . .

COPY apps/backend/prisma/ ./apps/backend/prisma/

# Genereate prisma client
RUN pnpm --filter backend exec prisma generate --schema=./prisma/schema.prisma

# ==========================================
# STAGE 3: The Development Runner
# ==========================================
FROM dev-builder AS development
WORKDIR /dev/backend

# Listening on port 4005
EXPOSE 4005
ENV NODE_ENV=development

# Runs the app
CMD ["pnpm", "exec","nodemon", "src/server.js"]

# ===================================================
# STAGE 4: The Dedicated Development Migration Runner
# ===================================================
FROM dev-builder AS dev-migration-runner
WORKDIR /app/apps/backend

# Runs db migration
CMD ["pnpm", "exec", "prisma", "db", "push", "--schema=./prisma/schema.prisma"]

# ==========================================
# STAGE 5: The Production Builder
# ==========================================
FROM base AS prod-builder
WORKDIR /app
COPY . .

# Production workspace assembly
RUN pnpm --filter backend deploy --prod /prod/backend
RUN pnpm --filter backend exec prisma generate --schema=/prod/backend/prisma/schema.prisma

# ==========================================
# STAGE 6: The Production Runner
# ==========================================
FROM prod-builder AS production
WORKDIR /prod/backend

# Create a secure, non-privileged system user for security isolation
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copies the pruned isolated production build from the builder
COPY --from=prod-builder /prod/backend ./

# Changes the file owner to a built-in, restricted user named node and switches to them for security purposes
RUN chown -R node:node /prod/backend
USER node

# Listening on port 4005
EXPOSE 4005
ENV NODE_ENV=production

# Runs the app
CMD ["node", "src/server.js"]

# ==================================================
# STAGE 7: The Dedicated Production Migration Runner
# ==================================================
FROM prod-builder AS prod-migration-runner
WORKDIR /app

# Runs db migration
CMD ["pnpm", "--filter", "backend", "exec", "prisma", "migrate", "dev", "--schema=./prisma/schema.prisma"]