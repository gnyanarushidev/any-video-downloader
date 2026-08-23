# Any Video Downloader

A web-based universal video downloader that supports multiple platforms including YouTube, Instagram, Facebook, Twitter/X, and LinkedIn.

## Features

- **Multi-platform support**: Download from YouTube, Instagram, Facebook, Twitter/X, and LinkedIn
- **Video & audio formats**: Choose quality tiers (Best/Better/Good) or extract audio as MP3/M4A
- **Playlist support**: Download entire playlists from supported platforms
- **Format selection**: Browse available formats with bitrate, resolution, and filesize info
- **ZIP bundling**: Download multiple files as a single archive
- **Metadata preview**: View video title, thumbnail, duration, author, and description before downloading
- **Responsive UI**: Modern interface built with Tailwind CSS and MUI

## Supported Platforms

- YouTube (youtube.com, youtu.be)
- Facebook (facebook.com, fb.watch)
- Instagram (instagram.com)
- Twitter/X (twitter.com, x.com)
- LinkedIn (linkedin.com)

## Prerequisites

- [yt-dlp](https://yt-dlp.org/) must be installed on the server
- Optionally, [FFmpeg](https://ffmpeg.org/) for format conversion

Set environment variables in `.env.local`:

```env
YTDLP_BINARY_PATH=/path/to/yt-dlp
FFMPEG_PATH=/path/to/ffmpeg
```

## Deploying On Render (Free / Hobby)

This app can run on Render as a Docker Web Service, but free-tier limits require conservative download settings.

### Recommended Render env vars

Set these in your Render service environment:

```env
YTDLP_BINARY_PATH=/usr/bin/yt-dlp
FFMPEG_PATH=/usr/bin/ffmpeg

# Keep resource usage low for free tier
MAX_DOWNLOAD_MB=250
MAX_DURATION_SECONDS=1800
MAX_ZIP_ITEMS=5
MAX_ZIP_TOTAL_MB=400

# Optional: disable ZIP downloads on free plan
ENABLE_ZIP_DOWNLOADS=false
```

### Why these limits are needed

- Large media downloads can exceed memory/time limits on low-resource instances.
- ZIP creation is CPU and memory intensive for multiple files.
- Cold starts and shared CPU can cause sporadic timeouts for long jobs.

### Practical expectation

- Small and medium downloads generally work.
- Very large videos, long durations, or heavy playlist ZIP requests may be rejected by design.
- For stable high-volume usage, move to a paid instance or split frontend/backend across services.

## Available Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development server (`next dev`) |
| `build` | Build production bundle (`next build`) |
| `start` | Start production server (`next start`) |
| `lint` | Run ESLint |

## Technology Stack

- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS, MUI Material UI
- **Downloads**: `ytdlp-nodejs` wrapper for yt-dlp
- **Animation**: GSAP
- **State Management**: Zustand

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to use the downloader.

## API Endpoints

- `POST /api/preview` - Fetch video metadata and formats
- `POST /api/download-url` - Get direct download URLs
- `GET /api/download?url=...&kind=video|audio&formatId=...` - Download file
- `GET /api/download-zip` - Download multiple files as ZIP

---