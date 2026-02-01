FROM node:20-bookworm-slim 

WORKDIR /app 

COPY package.json pnpm-lock.yaml . 


RUN corepack enable 
RUN pnpm install 


COPY . . 

RUN apt-get update && apt-get install -y ffmpeg curl \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp

ENV YTDLP_BINARY_PATH=/usr/local/bin/yt-dlp


RUN pnpm build 

EXPOSE 3000
CMD ["pnpm", "dev"]

