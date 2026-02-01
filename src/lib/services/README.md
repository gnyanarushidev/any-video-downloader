# Services

Business logic and external service integrations.

## Purpose

- Video download logic for each platform
- External API integrations
- Data processing and transformation
- Core business logic

## Example Structure

```typescript
// services/youtube.service.ts
export class YouTubeService {
  async downloadVideo(url: string) {
    // Implementation
  }
  
  async downloadPlaylist(url: string) {
    // Implementation
  }
}
```

## Files to Create

- `youtube.service.ts` - YouTube download logic
- `facebook.service.ts` - Facebook download logic
- `instagram.service.ts` - Instagram download logic
- `twitter.service.ts` - Twitter download logic
- `linkedin.service.ts` - LinkedIn download logic
