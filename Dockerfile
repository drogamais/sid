FROM node:20-alpine

WORKDIR /app

# Otimiza cache do docker para npm install
COPY package*.json ./
# Use `npm install` here because package-lock.json may be out of sync in local dev.
# For reproducible builds, regenerate package-lock.json locally and use `npm ci`.
RUN npm install --omit=dev --no-audit --no-fund

# Copia o código fonte e as views
COPY . .

EXPOSE 8004

CMD ["npm", "start"]
