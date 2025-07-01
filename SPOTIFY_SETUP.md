# Spotify Integration Setup Guide

This guide will help you set up the Spotify integration for searching Bible-related podcasts and audiobooks.

## Prerequisites

1. A Spotify Developer account (free)
2. Environment variables access

## Setup Steps

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (or create one if needed)
3. Click "Create App"
4. Fill in the app details:
   - **App name**: Your app name (e.g., "Bible Study Assistant")
   - **App description**: Brief description
   - **Website**: Your website URL (optional)
   - **Redirect URI**: Not needed for this integration
5. Select "Web API" for the APIs you'll be using
6. Check the agreement and click "Save"

### 2. Get Your Credentials

1. In your app dashboard, you'll see:
   - **Client ID**: A long string of characters
   - **Client Secret**: Click "View client secret" to reveal it

### 3. Add Environment Variables

Add these to your `.env.local` file:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### 4. Test the Integration

1. Restart your development server
2. Select a Bible verse in the scripture display
3. Click the music icon (🎵) that appears when verses are selected
4. Or right-click on any verse and select "Search on Spotify"

## Features

- **Verse-based Search**: Automatically searches for content related to selected Bible verses
- **Smart Filtering**: Filters results to show only Bible-related content
- **Multiple Search Strategies**: Uses different query approaches to find the best results
- **Podcast & Audiobook Support**: Searches both content types

## Troubleshooting

### No results found
- The integration uses multiple search strategies, but some verses may not have related content
- Try selecting different verses or chapters

### Authentication errors
- Double-check your Client ID and Client Secret
- Ensure there are no extra spaces in your environment variables
- Make sure the app is properly created in Spotify Developer Dashboard

### Rate limiting
- Spotify has rate limits on their API
- The integration caches access tokens to minimize requests
- If you hit rate limits, wait a few minutes before trying again

## Security Notes

- Never commit your Spotify credentials to version control
- Keep your `.env.local` file in `.gitignore`
- The Client Credentials flow is used, which doesn't require user login
- This integration only uses public Spotify data (no user data access) 