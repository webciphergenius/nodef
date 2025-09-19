# Add Missing Environment Variable

## Problem

When you upload new profile images, they're still getting the old URL format because the `CLOUDFLARE_R2_ACCOUNT_ID` environment variable is missing.

## Solution

Add this line to your `.env` file:

```bash
CLOUDFLARE_R2_ACCOUNT_ID=baf47774aaf6422cbee72d298e959246
```

## How to Add It

### Option 1: Edit .env file directly

1. Open your `.env` file
2. Add the line: `CLOUDFLARE_R2_ACCOUNT_ID=baf47774aaf6422cbee72d298e959246`
3. Save the file

### Option 2: Use command line

```bash
echo "CLOUDFLARE_R2_ACCOUNT_ID=baf47774aaf6422cbee72d298e959246" >> .env
```

## For Production

Make sure to add this environment variable to your production environment (Kinsta, Heroku, etc.) as well.

## Test

After adding the environment variable:

1. Restart your server
2. Try uploading a new profile image
3. The URL should now be in the format: `https://pub-baf47774aaf6422cbee72d298e959246.r2.dev/nodefrightmate/profile-images/...`

## What This Fixes

- ✅ New uploads will use the correct public development URL format
- ✅ Images will be accessible without authorization errors
- ✅ URLs will work in your app and admin dashboard
