# Knowledge Store Upload Troubleshooting Guide

## Problem: Files upload successfully but don't appear in the knowledge base

### Debugging Steps:

1. **Check Browser Console**
   - Open browser developer tools (F12)
   - Look for console logs when uploading:
     - "Attempting client-side upload..."
     - "Client-side upload successful" or "Falling back to server-side upload..."
     - "Process upload response:"
     - "Fetched items:"

2. **Test Database Connection**
   ```bash
   # Create a test item via API
   curl -X POST http://localhost:3000/api/knowledge-store/test-create \
     -H "Cookie: [your-session-cookie]"
   ```

3. **Check Debug Endpoint**
   - Visit: `/api/knowledge-store/debug`
   - This shows:
     - Current user ID
     - Items belonging to current user
     - All items in the database

4. **Common Issues & Solutions**

   **Issue: Files upload but don't save to database**
   - **Cause**: On localhost, the `onUploadCompleted` callback doesn't execute
   - **Solution**: The app now processes uploads manually on localhost

   **Issue: Different user IDs between upload and fetch**
   - **Cause**: Session mismatch (e.g., guest vs regular user)
   - **Solution**: Ensure you're using the same account throughout

   **Issue: Database connection errors**
   - **Cause**: Database configuration issues
   - **Solution**: Check DATABASE_URL environment variable

5. **Manual Database Check**
   - Check if items exist in database:
   ```sql
   SELECT id, userId, name, type, createdAt 
   FROM "KnowledgeStore" 
   ORDER BY "createdAt" DESC;
   ```

### Testing Upload Flow

1. **Test Server-Side Upload** (most reliable)
   - This bypasses client-side blob upload
   - Handles everything on the server
   - Should always work if database is configured

2. **Check Network Tab**
   - Look for these requests:
     - `/api/knowledge-store/blob-upload` (client-side)
     - `/api/knowledge-store/server-upload` (fallback)
     - `/api/knowledge-store/process-upload` (localhost processing)
     - `/api/knowledge-store` (fetching items)

3. **Verify Response Status**
   - All should return 200 OK
   - Check response bodies for error messages

### Environment Variables Required

```env
# Database connection
DATABASE_URL=

# Vercel Blob storage (for production)
BLOB_READ_WRITE_TOKEN=

# Auth configuration
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

### Quick Fixes

1. **Force Refresh**
   - After upload, manually refresh the page
   - Check if items appear

2. **Clear Browser Storage**
   - Clear cookies/session
   - Login again
   - Try uploading

3. **Use Server-Side Upload**
   - If client upload fails, it should automatically fallback
   - Check console for "Falling back to server-side upload..."

### Production vs Development

- **Development**: Always processes uploads manually since `onUploadCompleted` doesn't work
- **Production**: Should work with both client and server-side uploads
- **Both**: Server-side upload fallback ensures reliability

### Getting Help

When reporting issues, include:
1. Browser console logs
2. Network tab screenshots
3. `/api/knowledge-store/debug` response
4. Which environment (localhost/production)
5. User type (guest/regular) 