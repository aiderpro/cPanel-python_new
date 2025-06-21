# Production Build Fix

## The Issue
The error occurs because the production build hasn't been created yet. The `npm start` command tries to run `dist/index.js` which doesn't exist.

## Quick Fix

Run these commands in your production server:

```bash
cd /var/www/nginx-control-panel

# Install dependencies (if not done already)
npm install

# Build the project (creates dist/index.js)
npm run build

# Now start the production server
npm start
```

## Correct Production Startup Sequence

```bash
# 1. Build the application
npm run build

# 2. Start the production server
npm start
```

## For Systemd Service

Update your systemd service to ensure the build exists:

```bash
sudo systemctl stop domain-manager

# Build the project
cd /var/www/nginx-control-panel
npm run build

# Restart the service
sudo systemctl start domain-manager
```

## Verify Build Success

After running `npm run build`, you should see:
- `dist/index.js` file created
- `dist/public/` directory with frontend assets

```bash
# Check if build files exist
ls -la dist/
# Should show: index.js and public/ directory
```

## Alternative: Development Mode

If you want to run in development mode temporarily:

```bash
# Run in development mode (no build required)
npm run dev
```

This will start the server with live reloading using tsx instead of the built JavaScript files.