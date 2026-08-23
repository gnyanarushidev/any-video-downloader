FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && \
    pnpm config set ignore-scripts 0

RUN pnpm install

COPY . .

RUN pnpm build

# Install yt-dlp and ffmpeg using apt-get (Bookworm-slim is Debian-based)
RUN apt-get update && apt-get install -y --no-install-recommends yt-dlp ffmpeg curl

# Set yt-dlp binary path for ytdlp-nodejs
ENV YTDLP_BINARY_PATH=/usr/bin/yt-dlp
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["pnpm", "start"]