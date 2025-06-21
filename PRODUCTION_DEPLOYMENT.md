# Production Deployment Guide

## Prerequisites Verification

Since you already have Python, nginx, and acme.sh installed, let's verify the setup:

```bash
# Verify installations
python3 --version
nginx -v
~/.acme.sh/acme.sh --version
```

## Step 1: Prepare Directory Structure

```bash
# Create application directory
sudo mkdir -p /var/www/domain-manager
cd /var/www/domain-manager

# Create required directories
sudo mkdir -p server client
sudo mkdir -p logs

# Set permissions
sudo chown -R $USER:$USER /var/www/domain-manager
```

## Step 2: Upload Application Files

Transfer these files to your server in `/var/www/domain-manager/`:

### Backend Files (to `/var/www/domain-manager/server/`)
- `secure_domain_manager.py`
- `secure_api.py`
- `index.ts`
- `routes.ts`
- `vite.ts`

### Frontend Files (to `/var/www/domain-manager/`)
- All `client/` directory contents
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `tailwind.config.ts`
- `postcss.config.js`

### Shared Files
- `shared/` directory with `schema.ts`

## Step 3: Configure for Production

### Update Python Script Paths

Edit `/var/www/domain-manager/server/secure_domain_manager.py`:

```python
def __init__(self):
    # Production paths
    self.nginx_sites_available = "/etc/nginx/sites-available"
    self.nginx_sites_enabled = "/etc/nginx/sites-enabled"
    self.ssl_dir = "/etc/ssl/acme"  # or your SSL cert directory
    
    # Remove sample data creation for production
    # self._create_sample_data()  # Comment this out
```

### Set File Permissions

```bash
# Allow reading nginx configurations
sudo chmod 755 /etc/nginx/sites-available
sudo chmod 755 /etc/nginx/sites-enabled

# Allow writing new configurations (optional)
sudo chown www-data:www-data /etc/nginx/sites-available

# Make Python scripts executable
chmod +x /var/www/domain-manager/server/secure_api.py
chmod +x /var/www/domain-manager/server/secure_domain_manager.py
```

## Step 4: Install Node.js Dependencies

```bash
cd /var/www/domain-manager

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install
```

## Step 5: Build Frontend

```bash
cd /var/www/domain-manager
npm run build
```

## Step 6: Create Production Environment File

Create `/var/www/domain-manager/.env`:

```bash
NODE_ENV=production
PORT=3001
```

## Step 7: Create Systemd Service

Create `/etc/systemd/system/domain-manager.service`:

```ini
[Unit]
Description=Domain Manager Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/domain-manager
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Step 8: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/domain-manager.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/domain-manager.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 9: Start the Application

```bash
# Enable and start the service
sudo systemctl enable domain-manager
sudo systemctl start domain-manager

# Check status
sudo systemctl status domain-manager

# View logs
sudo journalctl -u domain-manager -f
```

## Step 10: Test the Installation

```bash
# Test Python API directly
cd /var/www/domain-manager/server
python3 secure_api.py list

# Test web interface
curl http://localhost:3001/api/domains
```

## Step 11: Configure SSL for Domain Manager (Optional)

```bash
# Install SSL for the domain manager itself
sudo certbot --nginx -d your-domain.com
```

## Step 12: Set Up Log Rotation

Create `/etc/logrotate.d/domain-manager`:

```
/var/www/domain-manager/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

## Security Considerations

### File Permissions
```bash
# Ensure secure permissions
sudo chown -R www-data:www-data /var/www/domain-manager
sudo chmod 750 /var/www/domain-manager
sudo chmod 640 /var/www/domain-manager/server/*.py
```

### Firewall Rules
```bash
# Allow only necessary ports
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
# Do not expose port 3001 externally
```

## Usage Workflow

### Adding a Domain
1. Use web interface to add domain
2. Manually run: `sudo nginx -t && sudo systemctl reload nginx`
3. For SSL: Use your existing acme.sh script

### Managing SSL
1. Click "Install SSL" in interface (prepares configuration)
2. Run your acme.sh script manually:
```bash
sudo ~/.acme.sh/acme.sh --issue -d domain.com -d www.domain.com --webroot /var/www/letsencrypt
sudo ~/.acme.sh/acme.sh --install-cert -d domain.com \
  --key-file /etc/ssl/acme/domain.com.key \
  --fullchain-file /etc/ssl/acme/domain.com.crt \
  --reloadcmd "systemctl reload nginx"
```

### Monitoring
- Access web interface at `http://your-domain.com`
- View application logs: `sudo journalctl -u domain-manager -f`
- Monitor nginx: `sudo tail -f /var/log/nginx/access.log`

## Troubleshooting

### Common Issues
```bash
# Check service status
sudo systemctl status domain-manager

# Check nginx configuration
sudo nginx -t

# Check application logs
sudo journalctl -u domain-manager --no-pager

# Test Python scripts
cd /var/www/domain-manager/server
python3 secure_api.py list
```

### Backup Important Files
```bash
# Backup nginx configurations
sudo tar -czf nginx-backup-$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/

# Backup SSL certificates
sudo tar -czf ssl-backup-$(date +%Y%m%d).tar.gz /etc/ssl/acme/
```

This deployment maintains complete security by using only file operations while providing a professional web interface for domain management.