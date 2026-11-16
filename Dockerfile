# syntax=docker/dockerfile:1

# The old image shipped a prebuilt `build/` and a `.env` copied from the machine
# that ran `docker build`. Both are gitignored, so it could only ever be built by
# the one person who happened to have them, and it baked secrets into a layer.
# This one compiles inside the image and reads the environment at run time.

# ---- build ----------------------------------------------------------------
FROM node:26-bookworm-slim AS build

# The lockfile was written by pnpm 12; npm is what every node image ships, so
# pinning pnpm through npm keeps the install resolving exactly as CI does.
RUN npm install -g pnpm@12.3.4

WORKDIR /app

# Copied before the source so the dependency layer survives a code change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json main.d.ts index.ts ./
COPY config ./config
COPY controllers ./controllers
COPY Error ./Error
COPY helpers ./helpers
COPY middleware ./middleware
COPY model ./model
COPY routes ./routes
COPY scripts ./scripts
COPY services ./services
COPY types ./types

RUN pnpm api:build

# ---- runtime --------------------------------------------------------------
FROM node:26-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN npm install -g pnpm@12.3.4

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# `typescript` moved to devDependencies, so this layer is the runtime tree only:
# no compiler in the image. bcrypt fetches its N-API prebuilt during install
# (see pnpm-workspace.yaml), which is why this needs network but no toolchain.
RUN pnpm install --frozen-lockfile --prod \
    && rm -rf /root/.local/share/pnpm/store /root/.npm

COPY --from=build /app/build ./build

# Multer writes here before the controller hands the file to S3, and nothing ever
# deletes it. The directory has to exist and be writable by the unprivileged
# user; compose mounts a size-capped tmpfs over it so it cannot grow forever.
RUN mkdir -p /app/static/lectures && chown -R node:node /app

USER node

EXPOSE 8280

CMD ["node", "build/index.js"]

