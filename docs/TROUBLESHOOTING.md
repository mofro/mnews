# Troubleshooting Guide

Common issues and solutions for the MNews application.

## Development Issues

### 1. Unexpected UI Behavior

**Symptoms**:

- UI doesn't reflect recent code changes
- Components not updating as expected
- Stale data being displayed

**Solutions**:

1. **Hard Refresh**: Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
2. **Restart Development Server**:

   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev  # Restart the development server
   ```

3. Clear browser cache and local storage
4. Try in an incognito/private window

### 2. Build Failures

**Symptoms**:

- `npm run build` fails
- TypeScript errors during build
- Module not found errors

**Solutions**:

1. Clear `node_modules` and reinstall:

   ```bash
   rm -rf node_modules
   npm install
   ```

2. Check TypeScript errors in the console
3. Verify all dependencies are installed

### 3. API Connection Issues

**Symptoms**:

- Network errors in browser console
- 500 Internal Server Errors
- Timeouts

**Solutions**:

1. Check if the API server is running
2. Verify environment variables:

   ```bash
   # Check if required env vars are set
   echo $KV_REST_API_URL
   echo $KV_REST_API_TOKEN
   ```

3. Test Redis connection:

   ```bash
   curl http://localhost:3000/api/test-redis
   ```

## Common Errors

### 1. "Invalid time value" RangeError

**Cause**: Invalid date strings being passed to date-fns

**Solution**:

1. Use the `fix-dates` endpoint to migrate existing data:

   ```bash
   curl -X POST http://localhost:3000/api/fix-dates
   ```

2. Ensure all date handling uses the `formatDateSafely` utility

### 2. Missing Environment Variables

**Solution**:

1. Create/update `.env.local` with required variables:

   ```env
   KV_REST_API_URL=your_redis_url
   KV_REST_API_TOKEN=your_redis_token
   ```

2. Restart the development server

## Performance Issues

### 1. Slow Page Loads

**Solutions**:

1. Check network tab for slow requests
2. Verify Redis connection performance
3. Implement pagination for large datasets

### 2. High Memory Usage

**Solutions**:

1. Check for memory leaks in components
2. Implement proper cleanup in useEffect hooks
3. Monitor with Chrome DevTools Memory panel

## Debugging Tips

1. **Enable Debug Logs**:

   ```typescript
   // In your component
   const debugLog = useDebugLogger('ComponentName');
   debugLog('Debug message', { data });
   ```

2. **Check Server Logs**:

   ```bash
   # View Next.js server logs
   npm run dev
   ```

3. **Inspect Network Requests**:
   - Open Chrome DevTools (F12)
   - Go to Network tab
   - Check for failed requests

## Still Stuck?

1. Check the GitHub Issues for similar problems
2. Clear all caches:

   ```bash
   rm -rf .next
   npm run build
   ```

3. Try a fresh clone of the repository
4. Contact the development team with error details
