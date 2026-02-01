# API Routes

This folder contains all API endpoints for the video downloader application.

## Structure

```
api/
├── youtube/       # YouTube download endpoints
├── facebook/      # Facebook download endpoints
├── instagram/     # Instagram download endpoints
├── twitter/       # Twitter download endpoints
└── linkedin/      # LinkedIn download endpoints
```

## Creating API Routes

Each platform folder should contain a `route.ts` file:

```typescript
// Example: api/youtube/route.ts
export async function POST(request: Request) {
  // Your logic here
}

export async function GET(request: Request) {
  // Your logic here
}
```

## API Endpoints

- `POST /api/youtube` - Download YouTube video/audio
- `POST /api/facebook` - Download Facebook video/audio
- `POST /api/instagram` - Download Instagram video/audio
- `POST /api/twitter` - Download Twitter video/audio
- `POST /api/linkedin` - Download LinkedIn video/audio
