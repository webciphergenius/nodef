# Admin Login Troubleshooting Guide

## Problem

Admin login redirects back to login screen instead of accessing the dashboard.

## Solutions

### 1. Create Admin User

First, make sure you have an admin user in the database:

```bash
node create-admin.js
```

**Default credentials:**

- Username: `admin`
- Password: `admin123`

### 2. Check Session Configuration

The session configuration has been updated to fix common issues:

```javascript
// In app.js - session configuration
cookie: {
  secure: false, // Set to false to fix HTTPS issues
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true, // Prevent XSS attacks
}
```

### 3. Environment Variables

Make sure these environment variables are set:

```bash
SESSION_SECRET=your-secret-key-change-in-production
```

### 4. Debugging Steps

1. **Check Server Logs**

   - Look for admin login attempts in the console
   - Check for session-related errors

2. **Test Admin Creation**

   ```bash
   node create-admin.js
   ```

3. **Check Database**

   ```sql
   SELECT * FROM admins;
   ```

4. **Test Login Flow**
   - Go to `/admin/login`
   - Try logging in with `admin` / `admin123`
   - Check console logs for debugging info

### 5. Common Issues & Fixes

#### Issue: "Invalid username or password"

- **Cause**: No admin user exists
- **Fix**: Run `node create-admin.js`

#### Issue: Session not persisting

- **Cause**: Session configuration issues
- **Fix**: Check `secure: false` in session config

#### Issue: Redirect loop

- **Cause**: Session middleware not working
- **Fix**: Check session middleware order in app.js

#### Issue: Database connection errors

- **Cause**: Database configuration issues
- **Fix**: Check database credentials in .env

### 6. Production Considerations

For production environments:

1. **Set secure session secret:**

   ```bash
   SESSION_SECRET=your-very-secure-random-string
   ```

2. **Consider using Redis for sessions:**

   ```bash
   npm install connect-redis redis
   ```

3. **Enable HTTPS and set secure cookies:**
   ```javascript
   cookie: {
     secure: true, // Only with HTTPS
     maxAge: 24 * 60 * 60 * 1000,
     httpOnly: true,
   }
   ```

### 7. Testing

After implementing fixes:

1. **Restart your server**
2. **Go to** `https://your-domain.com/admin/login`
3. **Login with** `admin` / `admin123`
4. **Check console logs** for debugging information
5. **Verify** you can access `/admin/dashboard`

### 8. Security Notes

- Change the default admin password after first login
- Use a strong SESSION_SECRET in production
- Consider implementing 2FA for admin accounts
- Regularly audit admin access logs

## Still Having Issues?

If the problem persists:

1. Check the server console logs for detailed error messages
2. Verify database connectivity
3. Test session functionality with a simple endpoint
4. Check if the issue is environment-specific (local vs production)
