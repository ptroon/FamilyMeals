# Production Dockerfile for FamilyMeals (Google App Hosting / Google Cloud Run)
FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled backend and frontend assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create data directory
RUN mkdir -p /app/data/uploads

EXPOSE 8080

CMD ["node", "dist/server/index.js"]

