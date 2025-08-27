
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --production && npm cache clean --force

COPY docker-entrypoint.sh /usr/local/bin/app-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/app-entrypoint.sh && chmod +x /usr/local/bin/app-entrypoint.sh

COPY . .

EXPOSE 5000
ENV PORT=5000

# Use sh explicitly
ENTRYPOINT ["sh","/usr/local/bin/app-entrypoint.sh"]
CMD ["node","index.js"]
