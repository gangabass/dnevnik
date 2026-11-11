FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY worker/package.json worker/package-lock.json ./worker/
RUN cd worker && npm ci --omit=dev
COPY worker/src ./worker/src
COPY shared ./shared
RUN ./node_modules/.bin/esbuild worker/src/index.ts --bundle --platform=node --format=esm --target=node24 --outfile=server/generated/worker.mjs

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/data/push.sqlite
WORKDIR /app
COPY --from=build /app/server/generated ./server/generated
COPY server/*.mjs ./server/
COPY worker/migrations ./worker/migrations
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/start.mjs"]
