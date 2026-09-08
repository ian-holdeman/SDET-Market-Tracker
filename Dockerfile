FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS build
ARG RELEASE_COMMIT
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_PUBLISHABLE
ARG PUBLIC_CALLBACK_URL
ARG APP_DEPLOYMENT=cloud-run
COPY . .
# The build validator accepts only public publishable credentials; secrets are runtime-only.
RUN RELEASE_COMMIT="$RELEASE_COMMIT" APP_DEPLOYMENT="$APP_DEPLOYMENT" VITE_SUPABASE_URL="$PUBLIC_SUPABASE_URL" VITE_SUPABASE_PUBLISHABLE_KEY="$PUBLIC_SUPABASE_PUBLISHABLE" VITE_AUTH_REDIRECT_URL="$PUBLIC_CALLBACK_URL" npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS runtime
WORKDIR /app
ENV NODE_ENV=production APP_DEPLOYMENT=cloud-run PORT=8080
ARG RELEASE_COMMIT
LABEL org.opencontainers.image.revision=$RELEASE_COMMIT
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist/client ./dist/client
COPY --from=build --chown=node:node /app/dist/server/server.mjs /app/dist/server/build-config.json ./dist/server/
COPY --chown=node:node package.json package-lock.json ./
USER node
EXPOSE 8080
CMD ["node", "dist/server/server.mjs"]
