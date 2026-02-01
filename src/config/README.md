# Config

Configuration files and environment variables.

## Purpose

- Application configuration
- Environment-specific settings
- API keys and secrets
- Feature flags

## Example Config

```typescript
// config/app.config.ts
export const appConfig = {
  maxFileSize: '500MB',
  supportedFormats: ['mp4', 'webm', 'mp3'],
  downloadTimeout: 300000, // 5 minutes
};

// config/platforms.config.ts
export const platformConfig = {
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
    maxPlaylistSize: 100,
  },
  facebook: {
    // Platform-specific config
  },
};
```

## Suggested Files

- `app.config.ts` - General app configuration
- `platforms.config.ts` - Platform-specific settings
- `env.config.ts` - Environment variables
- `constants.ts` - Application constants
