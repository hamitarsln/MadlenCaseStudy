
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --production && npm cache clean --force


COPY . .
RUN chmod +x docker-entrypoint.sh || true

EXPOSE 5000
ENV PORT=5000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node","index.js"]
