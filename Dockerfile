FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium libnss3 libxss1 libasound2 libgbm1 libatk-bridge2.0-0 \
    libgtk-3-0 fonts-liberation fonts-noto fonts-noto-extra fonts-noto-cjk \
    fonts-noto-cjk-extra fonts-dejavu fonts-stix \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium \
    CHROME_ARGS="--disable-gpu"
COPY package*.json ./
RUN npm ci --only=production
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["npm", "start"]