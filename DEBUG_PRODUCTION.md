# Debug Production Issues

## Run These Commands to Diagnose

```bash
cd /var/www/nginx-control-panel

# Test Python API directly
python3 server/secure_api.py list

# Check if paths are correct in production
python3 -c "
import sys
sys.path.append('server')
from secure_domain_manager import SecureDomainManager
dm = SecureDomainManager()
print('Sites available:', dm.nginx_sites_available)
print('Sites enabled:', dm.nginx_sites_enabled)
print('SSL dir:', dm.ssl_dir)
"

# Check permissions
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# Test Node.js Python execution
node -e "
const { spawn } = require('child_process');
const path = require('path');
const scriptPath = path.join(process.cwd(), 'server', 'secure_api.py');
console.log('Script path:', scriptPath);
const proc = spawn('python3', [scriptPath, 'list']);
proc.stdout.on('data', d => console.log('Output:', d.toString()));
proc.stderr.on('data', d => console.log('Error:', d.toString()));
proc.on('close', code => console.log('Exit code:', code));
"
```

## Common Production Issues

### 1. Python Path Issues
If you get module import errors:

```bash
# Make sure Python can find the modules
export PYTHONPATH=/var/www/nginx-control-panel/server:$PYTHONPATH
```

### 2. Permission Issues
```bash
# Check if app can read nginx directories
sudo -u www-data ls /etc/nginx/sites-available/
sudo -u www-data ls /etc/nginx/sites-enabled/
```

### 3. Python Version
```bash
# Check Python version
python3 --version
which python3
```

## Quick Fix Scripts

### Fix 1: Update Python paths for production
```bash
cd /var/www/nginx-control-panel/server

# Update secure_domain_manager.py for production
sed -i 's/nginx_config\/sites-available/\/etc\/nginx\/sites-available/' secure_domain_manager.py
sed -i 's/nginx_config\/sites-enabled/\/etc\/nginx\/sites-enabled/' secure_domain_manager.py
sed -i 's/nginx_config\/ssl/\/etc\/ssl\/acme/' secure_domain_manager.py
```

### Fix 2: Test API endpoint manually
```bash
# Test the exact same call the Node.js makes
cd /var/www/nginx-control-panel
python3 server/secure_api.py list
python3 server/secure_api.py stats
```

### Fix 3: Check service logs
```bash
# See detailed error messages
sudo journalctl -u domain-manager -f --no-pager
```