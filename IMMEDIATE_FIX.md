# Immediate Production Fix

## Run These Commands Now

```bash
cd /var/www/nginx-control-panel

# Install dependencies
npm install

# Build the production files
npm run build

# Verify the build worked
ls -la dist/
# You should see: index.js and public/ directory

# Now start the production server
npm start
```

## If Build Fails

Check for missing dependencies:

```bash
# Install build tools if missing
npm install -g typescript esbuild

# Try building again
npm run build
```

## For Systemd Service

After successful build:

```bash
# Stop service
sudo systemctl stop domain-manager

# Start service (it will now find dist/index.js)
sudo systemctl start domain-manager

# Check status
sudo systemctl status domain-manager
```

## Test After Fix

```bash
# Test local API
curl http://localhost:3001/api/domains

# Check logs
sudo journalctl -u domain-manager -f
```

The error happens because npm start looks for dist/index.js which only exists after running npm run build.