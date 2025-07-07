# File Upload Configuration for Vercel Deployment (Vercel Blob)

This guide ensures your Vercel deployment can handle file uploads beyond the 4.5MB limit using Vercel Blob storage, supporting files up to 500MB.

## Configuration Steps

### 1. Enable Vercel Blob Storage

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" and select "Blob"
4. Follow the setup wizard to create your blob store
5. Vercel will automatically add the required environment variables:
   - `BLOB_READ_WRITE_TOKEN`

### 2. Environment Variables (Automatically Added)

Vercel will automatically add these when you create a Blob store:

```bash
# Vercel Blob storage token (automatically added)
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Optional: Increase memory for processing large files
NODE_OPTIONS=--max-old-space-size=4096
```

### 3. Vercel Project Settings

1. Go to your Vercel project dashboard
2. Navigate to Settings → Functions
3. Set the following:
   - **Function Maximum Duration**: 60 seconds (Pro plan) or 10 seconds (Hobby)
   - **Function Memory**: 1024 MB or higher

### 4. Code Configuration (Already Done)

The following configurations have been set in the codebase:

#### Vercel Blob Upload Route (app/api/knowledge-store/blob-upload/route.ts)
- Uses `handleUpload` from `@vercel/blob/client`
- Authenticates users before generating upload tokens
- Processes files after upload completion
- Extracts text content and stores in database

#### Client-side Implementation (components/knowledge-store-dialog.tsx)
- Uses `upload` from `@vercel/blob/client`
- Direct browser-to-blob uploads (bypasses 4.5MB limit)
- File size limit: Up to 500MB (Vercel Blob limit)
- Supported formats: PDF, DOCX, DOC, TXT, RTF, CSV, MD, HTML

### 5. Testing After Deployment

1. Deploy your changes to Vercel
2. Test with various file sizes:
   - Small files (< 4.5MB) - Should work immediately
   - Medium files (5-20MB) - Should upload via Vercel Blob
   - Large files (20-100MB) - Should still work with Vercel Blob
3. Monitor the Function logs in Vercel dashboard
4. Check Vercel Blob dashboard for uploaded files

### Troubleshooting

If uploads are not working after deployment:

1. **Verify Blob Storage is enabled**: Check Storage tab in Vercel dashboard
2. **Check environment variables**: Ensure `BLOB_READ_WRITE_TOKEN` is set
3. **Local development**: Note that `onUploadCompleted` won't work on localhost
   - Use ngrok or similar tunneling service for full local testing
   - Or test the upload flow in preview/production deployments
4. **Check Function logs**: Look for authentication or processing errors
5. **Monitor Blob usage**: Check your Vercel Blob dashboard for storage limits

### Notes

- **Vercel Blob Limits**:
  - Max file size: 500MB per file
  - Storage limits vary by plan (check your Vercel dashboard)
  - No request body size limitations (uploads bypass serverless functions)
  
- **Function Timeouts**:
  - Hobby plan: 10-second function timeout
  - Pro plan: 60-second function timeout
  - Enterprise: Higher limits available
  
- **Local Development**:
  - File uploads work but `onUploadCompleted` requires ngrok or similar
  - Test full flow in preview deployments for best results

### Benefits of Vercel Blob Approach

1. **No size limits**: Bypasses the 4.5MB serverless function limit
2. **Better performance**: Direct uploads don't go through your server
3. **Scalability**: Handles concurrent uploads efficiently
4. **Cost effective**: Pay only for storage used
5. **Global CDN**: Files are served from Vercel's edge network 