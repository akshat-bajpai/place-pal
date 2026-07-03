# Node runtime + Python 3 (required by utils/ats_optimizer.py, stdlib-only)
FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Mount a persistent volume here in production, or uploads vanish on redeploy
RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 8000

CMD ["node", "index.js"]
