# 20MB File Upload Configuration for Vercel Deployment

This guide ensures your Vercel deployment can handle file uploads up to 20MB.

## Configuration Steps

### 1. Environment Variables (Vercel Dashboard)

Add these environment variables in your Vercel project settings:

```bash
# Increase body parser limit (required for Vercel)
BODY_PARSER_LIMIT=20mb

# Optional: Increase memory for processing large files
NODE_OPTIONS=--max-old-space-size=4096
```

### 2. Vercel Project Settings

1. Go to your Vercel project dashboard
2. Navigate to Settings → Functions
3. Set the following:
   - **Function Maximum Duration**: 60 seconds (Pro plan) or 10 seconds (Hobby)
   - **Function Memory**: 1024 MB or higher

### 3. Code Configuration (Already Done)

The following configurations have been set in the codebase:

#### next.config.ts
```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '20mb',
  },
}
```

#### API Route (app/api/knowledge-store/upload/route.ts)
- Runtime: nodejs
- Max duration: 60 seconds
- Content-length validation before parsing

#### Client-side validation
- File size limit: 20MB
- Supported formats: PDF, DOCX, DOC, TXT, RTF, CSV, MD, HTML

### 4. Vercel Deployment Configuration

The `vercel.json` file has been configured with:
```json
{
  "functions": {
    "app/api/knowledge-store/upload/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### 5. Testing After Deployment

1. Deploy your changes to Vercel
2. Test with a file between 15-20MB
3. Monitor the Function logs in Vercel dashboard

### Troubleshooting

If you still get 413 errors after deployment:

1. **Clear Vercel cache**: Redeploy with "Force new deployment"
2. **Check Function logs**: Look for specific error messages
3. **Verify environment variables**: Ensure they're set in production
4. **Consider using Vercel Blob Storage**: For files larger than 20MB

### Alternative: Vercel Blob Storage

For files larger than 20MB or better performance, consider using Vercel Blob Storage:

1. Install: `npm install @vercel/blob`
2. Enable Blob Storage in Vercel dashboard
3. Update upload logic to use blob.upload() instead

### Notes

- Hobby plan has a 10-second function timeout limit
- Pro plan allows up to 300-second timeouts
- Enterprise plans have higher limits
- Large file processing may require more memory allocation 