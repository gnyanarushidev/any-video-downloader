# Validators

Input validation schemas and functions.

## Purpose

- Request body validation
- URL validation
- Input sanitization
- Data validation rules

## Example Validators

```typescript
// validators/download.validator.ts
export const downloadSchema = {
  url: { type: 'string', required: true },
  type: { type: 'string', enum: ['video', 'audio'] },
  quality: { type: 'string', optional: true }
};

export function validateDownloadRequest(data: unknown) {
  // Validation logic
}
```

## Suggested Files

- `youtube.validator.ts` - YouTube-specific validation
- `facebook.validator.ts` - Facebook-specific validation
- `instagram.validator.ts` - Instagram-specific validation
- `twitter.validator.ts` - Twitter-specific validation
- `linkedin.validator.ts` - LinkedIn-specific validation
- `common.validator.ts` - Shared validation logic
