FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && \
    pnpm config set ignore-scripts 0

RUN pnpm install

COPY . .

RUN pnpm build

# Install ffmpeg and fetch latest yt-dlp binary from official releases
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates python3 && \
    curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    /usr/local/bin/yt-dlp --version

# Set yt-dlp binary path for ytdlp-nodejs
ENV YTDLP_BINARY_PATH=/usr/local/bin/yt-dlp
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["pnpm", "start"]