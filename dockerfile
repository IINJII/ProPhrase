# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install --production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/assets ./dist/assets
EXPOSE 3000
CMD ["node", "dist/index.js"]