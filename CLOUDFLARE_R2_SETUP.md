# Cloudflare R2 Setup Guide

This guide explains how to set up Cloudflare R2 for file storage in your application.

## Why Cloudflare R2?

- ✅ **No egress fees** - Unlike AWS S3, R2 doesn't charge for data transfer
- ✅ **Global CDN** - Files served from Cloudflare's global network
- ✅ **S3 Compatible** - Easy migration from S3
- ✅ **Persistent** - Files never lost during deployments
- ✅ **Scalable** - Handles any amount of files
- ✅ **Cost-effective** - Very competitive pricing

## Setup Steps

### 1. Create Cloudflare R2 Bucket

1. **Login to Cloudflare Dashboard**

   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Navigate to "R2 Object Storage"

2. **Create Bucket**

   - Click "Create bucket"
   - Choose a unique bucket name (e.g., `your-app-uploads`)
   - Select location (choose closest to your users)
   - Click "Create bucket"

3. **Make Bucket Public**
   - Go to your bucket settings
   - Click on "Settings" tab
   - Scroll down to "Public Access"
   - Enable "Allow Access" for public access
   - This allows files to be accessed via direct URLs

### 2. Create R2 API Token

1. **Go to R2 API Tokens**

   - In R2 dashboard, click "Manage R2 API tokens"
   - Click "Create API token"

2. **Configure Token**

   - **Token name**: `your-app-uploads-token`
   - **Permissions**:
     - Object Read
     - Object Write
     - Object Delete
   - **Bucket**: Select your bucket
   - Click "Create API token"

3. **Save Credentials**
   - Copy the **Access Key ID**
   - Copy the **Secret Access Key**
   - Save these securely

### 3. Get R2 Endpoint URL

Your R2 endpoint URL format is:

```
https://[account-id].r2.cloudflarestorage.com
```

To find your account ID:

1. Go to Cloudflare dashboard
2. Look at the right sidebar - your Account ID is displayed there

### 4. Find Your Account ID

To get your account ID:

1. **From R2 Dashboard**

   - Go to your R2 bucket
   - Look at the URL: `https://dash.cloudflare.com/your-account-id/r2/object-storage`
   - The account ID is in the URL

2. **From Public Development URL**
   - If you have a working public URL like `https://pub-baf47774aaf6422cbee72d298e959246.r2.dev`
   - Your account ID is: `baf47774aaf6422cbee72d298e959246`

### 5. Set Environment Variables

Add these environment variables to your production environment:

```bash
# Required
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id

# Optional: Custom domain (recommended)
CLOUDFLARE_R2_CUSTOM_DOMAIN=https://uploads.yourdomain.com
```

### 5. Set Up Custom Domain (Recommended)

1. **Add Custom Domain in R2**

   - Go to your R2 bucket
   - Click "Settings" tab
   - Scroll to "Custom Domains"
   - Click "Connect Domain"
   - Enter your subdomain (e.g., `uploads.yourdomain.com`)

2. **Configure DNS**

   - Add a CNAME record in your DNS:
     - **Name**: `uploads`
     - **Target**: `your-bucket-name.your-account-id.r2.cloudflarestorage.com`
     - **Proxy status**: Proxied (orange cloud)

3. **Update Environment Variable**
   ```bash
   CLOUDFLARE_R2_CUSTOM_DOMAIN=https://uploads.yourdomain.com
   ```

## File Organization

Files are organized in folders:

- **Driver Documents**: `driver-documents/`

  - License files
  - Insurance files
  - Registration files

- **Shipment Images**: `shipment-images/`

  - Package photos
  - Delivery photos

- **Profile Images**: `profile-images/`
  - User profile pictures

## How It Works

### Automatic Detection

The code automatically detects if R2 is configured:

```javascript
// If R2 environment variables are set
if (isR2Configured()) {
  // Upload to Cloudflare R2
  // Files stored in cloud, served via CDN
} else {
  // Fallback to local storage
  // Files stored on server
}
```

### File URLs

- **R2 URLs**: `https://uploads.yourdomain.com/driver-documents/1234567890-license.pdf`
- **Local URLs**: `/uploads/1234567890-license.pdf`

## Migration from Local Storage

If you have existing files in local storage:

1. **Upload existing files to R2**
2. **Update database** to use R2 URLs
3. **Deploy with R2 configuration**

## Benefits

### Performance

- ⚡ **Global CDN** - Files served from edge locations worldwide
- ⚡ **Fast uploads** - Direct to R2, no server processing
- ⚡ **Optimized delivery** - Cloudflare's optimization features

### Reliability

- 🛡️ **99.9% uptime** - Cloudflare's global infrastructure
- 🛡️ **Automatic backups** - Built-in redundancy
- 🛡️ **No data loss** - Files persist across deployments

### Cost

- 💰 **No egress fees** - Unlike AWS S3
- 💰 **Pay for storage only** - No bandwidth charges
- 💰 **Free tier** - 10GB storage, 1M requests/month

## Monitoring

### Cloudflare Dashboard

- Monitor storage usage
- View request analytics
- Check bandwidth usage

### Application Logs

Look for these log messages:

```
Using Cloudflare R2 for file storage
```

## Troubleshooting

### Common Issues

1. **"R2 upload failed"**

   - Check environment variables
   - Verify API token permissions
   - Ensure bucket exists

2. **Files not accessible (Authorization Error)**

   - **Most Common**: Bucket is not set to public access
   - Go to bucket Settings → Public Access → Enable "Allow Access"
   - Check custom domain DNS if using custom domain
   - Test with direct R2 URL first
   - Verify API token has read permissions

3. **"InvalidArgument - Authorization" Error**

   - This means the bucket is private
   - Enable public access in bucket settings
   - Or use signed URLs for private files

4. **Slow uploads**
   - Check file size limits
   - Verify network connection
   - Consider chunked uploads for large files

### Testing

Test R2 configuration:

```bash
# Check if R2 is configured
curl -X GET "https://your-api.com/api/test-r2"

# Upload test file
curl -X POST "https://your-api.com/api/upload-test" \
  -F "file=@test.jpg"
```

## Security

### Best Practices

- ✅ Use environment variables for credentials
- ✅ Set appropriate API token permissions
- ✅ Enable CORS for web uploads
- ✅ Use HTTPS for all file URLs
- ✅ Implement file type validation
- ✅ Set file size limits

### Access Control

- Files are publicly accessible by default
- Use signed URLs for private files
- Implement authentication for sensitive documents

## Support

- **Cloudflare R2 Docs**: [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2)
- **API Reference**: [developers.cloudflare.com/r2/api](https://developers.cloudflare.com/r2/api)
- **Community**: [community.cloudflare.com](https://community.cloudflare.com)
