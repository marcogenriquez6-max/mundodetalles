FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY --from=build /app/dist ./dist
EXPOSE 3002
CMD ["node", "dist/main.js"]
