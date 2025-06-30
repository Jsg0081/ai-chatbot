# Setting up Vercel Environment Variables

## Required Environment Variables

1. **POSTGRES_URL**
   - Option A: Use Vercel Postgres
     1. Go to your Vercel dashboard
     2. Navigate to the "Storage" tab
     3. Click "Create Database" → Select "Postgres"
     4. Follow the setup wizard
     5. It will automatically add POSTGRES_URL to your project
   
   - Option B: Use external PostgreSQL
     - Format: `postgresql://username:password@host:port/database?sslmode=require`

2. **AUTH_SECRET**
   - Generate with: `openssl rand -base64 32`
   - Example: `zpJWrMvTb2H5FGvRPMqShVrJRM6u+7ksXkNRmPg3vFE=`

3. **XAI_API_KEY**
   - Get from: https://console.x.ai/
   - Format: `xai-...`

## How to Add to Vercel

1. Go to: https://vercel.com/[your-username]/[your-project]/settings/environment-variables
2. For each variable:
   - Enter the key (e.g., POSTGRES_URL)
   - Enter the value
   - Select environments: ✓ Production, ✓ Preview, ✓ Development
   - Click "Save"

## After Adding Variables

1. Trigger a new deployment:
   - Push a commit to your repository, or
   - Click "Redeploy" in Vercel dashboard

## Verify Database Connection

Once deployed, the migrations will run automatically during the build process.
