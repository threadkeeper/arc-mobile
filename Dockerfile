# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV FOUNDRY_PROXY_PORT=8080
ENV HOST=0.0.0.0
ENV FOUNDRY_ENDPOINT=https://gaia-foundry-202045.openai.azure.com/openai/v1/responses
ENV FOUNDRY_MODEL=gpt-6-astra

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 8080
CMD ["node", "--experimental-strip-types", "server/foundryProxy.ts"]
