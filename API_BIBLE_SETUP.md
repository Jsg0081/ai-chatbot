# API.Bible Integration Setup Guide

## Overview

This guide will help you set up the API.Bible integration in your Bible Spark application. The integration provides access to hundreds of Bible translations in multiple languages.

## Prerequisites

1. An API.Bible account and API key
2. Your existing Bible Spark application

## Step 1: Get Your API.Bible Key

1. Go to [https://scripture.api.bible/signup](https://scripture.api.bible/signup)
2. Create an account and verify your email
3. Create a new application at [https://scripture.api.bible/admin/applications/new](https://scripture.api.bible/admin/applications/new)
4. Wait for approval (usually within 24 hours)
5. Once approved, find your API key in your dashboard

## Step 2: Add Environment Variable

Add your API.Bible key to your environment variables:

```bash
# In your .env.local file
API_BIBLE_KEY=your_api_bible_key_here
```

## Step 3: Deploy to Vercel (if applicable)

If you're using Vercel, add the environment variable in your project settings:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add `API_BIBLE_KEY` with your API key value

## Features Implemented

### 1. Dynamic Translation Loading
- Translations are fetched from API.Bible and cached for 24 hours
- Grouped by language for better organization
- Shows translation name and abbreviation

### 2. Scripture Fetching
- Supports fetching any book/chapter from available translations
- Maintains compatibility with existing ESV API
- Falls back to bible-api.com for unsupported translations

### 3. Translation Selector UI
- Enhanced dropdown with language grouping
- Shows popular translations at the top
- Searchable list of all available translations

## API Endpoints Created

### `/api/bible-translations`
Fetches all available Bible translations from API.Bible.

**Query Parameters:**
- `language` (optional): Filter by language code

**Response:**
```json
[
  {
    "language": {
      "id": "eng",
      "name": "English",
      "nameLocal": "English"
    },
    "translations": [
      {
        "id": "de4e12af7f28f599-01",
        "abbreviation": "KJV",
        "name": "King James Version",
        "type": "text"
      }
    ]
  }
]
```

### `/api/bible-passage`
Fetches a specific Bible passage.

**Query Parameters:**
- `bibleId` (required): The Bible translation ID
- `book` (required): Book name (e.g., "John")
- `chapter` (required): Chapter number
- `verse` (optional): Starting verse number
- `endVerse` (optional): Ending verse number

**Response:**
```json
{
  "reference": "John 3:16",
  "verses": [
    {
      "verse": 16,
      "text": "For God so loved the world..."
    }
  ],
  "text": "Full passage text",
  "translation_id": "de4e12af7f28f599-01",
  "translation_name": "King James Version",
  "translation_note": "Public Domain"
}
```

## Usage in Components

The Scripture Display component automatically integrates API.Bible translations:

```typescript
// The translation selector now shows all API.Bible translations
<Select value={translation} onValueChange={setTranslation}>
  <SelectTrigger>
    <SelectValue placeholder="Select translation" />
  </SelectTrigger>
  <SelectContent>
    {/* Translations grouped by language */}
  </SelectContent>
</Select>
```

## Troubleshooting

### "API_BIBLE_KEY environment variable is not set"
- Ensure you've added the API key to your `.env.local` file
- Restart your development server after adding the key

### Translations not loading
- Check your API key is valid and approved
- Verify your network connection
- Check the browser console for errors

### Scripture not displaying
- Ensure the book name matches API.Bible's expected format
- Some translations may not have all books available
- Check the API response in the Network tab

## Rate Limits

API.Bible has the following rate limits:
- 5,000 requests per day for free accounts
- 500 consecutive verses per request

The integration includes caching to minimize API calls:
- Translations list is cached for 24 hours
- Consider implementing passage caching if needed

## Future Enhancements

Potential improvements to the integration:

1. **Search functionality**: Add ability to search across translations
2. **Passage caching**: Cache frequently accessed passages
3. **Audio Bibles**: Integrate audio Bible support
4. **Parallel translations**: Show multiple translations side-by-side
5. **Translation filtering**: Filter by language, type, or features

## Support

For API.Bible specific issues:
- Documentation: [https://docs.api.bible/](https://docs.api.bible/)
- Support: [https://support.api.bible/](https://support.api.bible/)

For integration issues:
- Check the error logs in your browser console
- Verify your API key is correctly configured
- Ensure all environment variables are set 