# Types

TypeScript type definitions and interfaces.

## Purpose

- Shared TypeScript types
- API request/response interfaces
- Domain models
- Enums and constants

## Example Types

```typescript
// types/download.types.ts
export interface DownloadRequest {
  url: string;
  type: 'video' | 'audio';
  quality?: string;
  isPlaylist?: boolean;
}

export interface DownloadResponse {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export type Platform = 'youtube' | 'facebook' | 'instagram' | 'twitter' | 'linkedin';
```

## Suggested Files

- `api.types.ts` - API request/response types
- `download.types.ts` - Download-related types
- `platform.types.ts` - Platform-specific types
- `error.types.ts` - Error types
- `common.types.ts` - Shared common types
