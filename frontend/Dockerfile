# Production build of the Next.js app, for docker compose. (Vercel builds it on its own.)
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are baked into the bundle at build time.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["npm", "start"]
