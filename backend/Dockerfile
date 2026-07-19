# Node runtime + Python 3 (utils/ats_optimizer.py reads PDF/DOCX resumes)
FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps for the ATS scorer (PyPDF2 / python-docx). Debian marks the system
# Python as externally-managed, so --break-system-packages is required in-container.
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Mount a persistent volume here in production, or uploads vanish on redeploy
RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 8000

CMD ["node", "index.js"]
