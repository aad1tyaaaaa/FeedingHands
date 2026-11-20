# Static build of the Next.js app, served by nginx, for docker compose.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are baked into the bundle at build time.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 80
