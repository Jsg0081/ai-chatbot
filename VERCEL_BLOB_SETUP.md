# Vercel Blob Setup for File Uploads

## Quick Setup Guide

### 1. Enable Vercel Blob in Your Project

**If you already have Vercel Blob set up:**
- You'll see an error about `BLOB_READ_WRITE_TOKEN` already existing
- This is perfect! Just click **Cancel** and proceed to step 2
- Your existing Blob store will work with the Knowledge Store uploads

**If you don't have Vercel Blob yet:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to the **Storage** tab
4. Click **Create Database** → Select **Blob**
5. Follow the setup wizard
6. Vercel will automatically add `BLOB_READ_WRITE_TOKEN` to your environment

### 2. Deploy Your Changes

```bash
git add .
git commit -m "Add Vercel Blob support for large file uploads"
git push
```

### 3. Test the Implementation

After deployment:
- Try uploading a small file (< 5MB)
- Try uploading a medium file (10-50MB)
- Try uploading a large file (100MB+)

All should work seamlessly!

## How It Works

1. **Client-side**: Files are uploaded directly from the browser to Vercel Blob
2. **Token Exchange**: Your server authenticates the user and provides an upload token
3. **Direct Upload**: The file bypasses your serverless function (no 4.5MB limit!)
4. **Post-processing**: After upload, the server extracts text and saves to your database

## Local Development

- File uploads work locally
- The `onUploadCompleted` callback requires ngrok for local testing
- Alternatively, test in preview/production deployments

## Benefits

✅ **No file size limits** (up to 500MB)  
✅ **Better performance** (direct uploads)  
✅ **Automatic CDN** (global distribution)  
✅ **Cost effective** (pay for what you use)  

## Troubleshooting

If uploads fail:
1. Check that Blob Storage is enabled in Vercel
2. Verify `BLOB_READ_WRITE_TOKEN` exists in environment variables
3. Check function logs for specific errors
4. Ensure your Vercel plan has sufficient Blob storage

## References

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Bypassing 4.5MB Limit Guide](https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions) 