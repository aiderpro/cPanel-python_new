# Production 500 Error Fix

## The Problem
The 500 errors occur because the Python scripts aren't executing properly in your production environment. This usually happens due to:
1. Python path issues
2. Permission problems
3. Module import errors

## Immediate Fix Commands

Run these on your production server:

```bash
cd /var/www/nginx-control-panel

# 1. Copy the updated Python files
# Make sure you have these files:
# - server/production_api.py
# - server/production_domain_manager.py

# 2. Make scripts executable
chmod +x server/production_api.py
chmod +x server/production_domain_manager.py

# 3. Test Python scripts directly
python3 server/production_api.py list
python3 server/production_api.py stats

# 4. If the above works, rebuild and restart
npm run build
sudo systemctl restart domain-manager

# 5. Check service status
sudo systemctl status domain-manager
sudo journalctl -u domain-manager -f
```

## If Python Tests Fail

### Check Python Environment
```bash
# Verify Python version
python3 --version

# Test module imports
python3 -c "import os, glob, json, re, datetime; print('Modules OK')"
```

### Check File Permissions
```bash
# Ensure app can read nginx directories
sudo chmod 755 /etc/nginx/sites-available
sudo chmod 755 /etc/nginx/sites-enabled

# Check if directories exist
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
```

### Test with Different User
```bash
# Test as www-data user (service user)
sudo -u www-data python3 server/production_api.py list
```

## Alternative: Use Local Fallback

If nginx directories aren't accessible, the production script automatically falls back to local directories and creates sample data.

## Monitor Logs

```bash
# Watch service logs
sudo journalctl -u domain-manager -f

# Check for specific errors
sudo journalctl -u domain-manager --no-pager | grep -i error
```

## Quick Test URL

Once fixed, test these endpoints:
- http://your-domain:3001/api/domains
- http://your-domain:3001/api/domains/stats

The production script automatically detects if it's running on a real server (with /etc/nginx directories) or in development mode.