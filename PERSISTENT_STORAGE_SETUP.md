# Persistent Storage Setup for Kinsta

This document explains how to set up persistent storage in Kinsta to preserve uploaded files across deployments.

## Problem

When deploying new code to Kinsta, the file system gets reset, causing all uploaded files (shipment images, profile pictures, driver documents) to be lost.

## Solution

Use Kinsta's persistent storage feature to mount a volume that persists across deployments.

## Setup Steps

### 1. Create Persistent Storage in Kinsta Dashboard

1. **Login to MyKinsta Dashboard**

   - Go to [my.kinsta.com](https://my.kinsta.com)
   - Select your application

2. **Navigate to Disks Section**

   - Go to your app dashboard
   - Click on "Disks" in the left sidebar

3. **Create New Disk**
   - Click "Create disk"
   - Fill in the details:
     - **Process**: Select your web process
     - **Mount Path**: `/app/uploads`
     - **Size**: Choose appropriate size (start with 1GB, can be increased later)
   - Click "Create disk"

### 2. Environment Variable (Optional)

You can set a custom path using environment variable:

- **Variable Name**: `PERSISTENT_STORAGE_PATH`
- **Value**: `/app/uploads` (or your custom path)

### 3. Deploy Your Code

The code has been updated to automatically:

- ✅ Detect if persistent storage is available
- ✅ Use persistent storage path if mounted
- ✅ Fallback to local uploads for development
- ✅ Create directory if it doesn't exist
- ✅ Serve files from the correct path

## How It Works

### Code Changes Made:

1. **Created `utils/uploadConfig.js`** - Centralized upload configuration
2. **Updated `routes/userRoutes.js`** - User file uploads (profile, documents)
3. **Updated `routes/shipmentRoutes.js`** - Shipment image uploads
4. **Updated `app.js`** - Static file serving

### Automatic Detection:

```javascript
// The code automatically detects persistent storage
const persistentPath = process.env.PERSISTENT_STORAGE_PATH || "/app/uploads";
const localPath = path.resolve(process.cwd(), "uploads");

// Uses persistent storage if available, otherwise local uploads
if (fs.existsSync(persistentPath)) {
  return persistentPath; // Production with persistent storage
} else {
  return localPath; // Development or no persistent storage
}
```

## File Types Preserved:

- ✅ **Driver Documents**: License files, insurance files, registration files
- ✅ **Profile Images**: User profile pictures
- ✅ **Shipment Images**: Package photos uploaded by shippers
- ✅ **Any other uploaded files**

## Verification:

After setup, check the logs for:

```
Using persistent storage path: /app/uploads
```

## Backup:

Kinsta provides automatic daily backups of persistent storage (kept for 7 days).

## Troubleshooting:

- If files are still lost, verify the mount path is correct
- Check that the disk is attached to the correct process
- Ensure the disk size is sufficient
- Check application logs for upload path messages

## Cost:

Persistent storage incurs additional costs based on size. Monitor usage in Kinsta dashboard.
