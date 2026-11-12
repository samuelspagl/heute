# syntax=docker/dockerfile:1
FROM oven/bun:1.4.4-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun scripts/collect-licenses.mjs
RUN bun --bun run build

FROM build AS checks
RUN bun test && bun --bun run typecheck

FROM oven/bun:1.4.4-slim AS runtime
WORKDIR /app
ARG SOURCE_URL
LABEL org.opencontainers.image.source=$SOURCE_URL
LABEL org.opencontainers.image.title="Heute"
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 NUXT_DATABASE_PATH=/data/heute.sqlite
RUN mkdir /data && chown bun:bun /data
COPY --from=build --chown=bun:bun /app/.output ./.output
COPY --from=build --chown=bun:bun /app/.licenses ./licenses/dependencies
COPY LICENSE ./licenses/LICENSE
COPY THIRD_PARTY_NOTICES.md ./licenses/THIRD_PARTY_NOTICES.md
USER bun
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]
