# Quick Production Setup

## Option 1: Automated Deployment (Recommended)

1. **Download the project files to your server:**
```bash
# Create temporary directory
mkdir /tmp/domain-manager-setup
cd /tmp/domain-manager-setup

# Download all files from this project
# (Copy all files from the development environment)
```

2. **Run the automated deployment script:**
```bash
chmod +x deploy.sh
./deploy.sh
```

3. **Install SSL for the management interface:**
```bash
sudo certbot --nginx -d your-domain.com
```

## Option 2: Manual Setup

### Step 1: Transfer Files
Copy these essential files to `/var/www/domain-manager/`:

**Required Files:**
- `server/secure_domain_manager.py`
- `server/secure_api.py`
- `server/index.ts`
- `server/routes.ts`
- `server/vite.ts`
- `shared/schema.ts`
- `package.json`
- `package-lock.json`
- All `client/` directory contents
- Configuration files: `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`

### Step 2: Quick Configuration
```bash
cd /var/www/domain-manager

# Install dependencies
npm install

# Update Python paths for production
sed -i 's|nginx_config|/etc/nginx|' server/secure_domain_manager.py

# Build application
npm run build

# Set permissions
sudo chown -R www-data:www-data .
chmod +x server/*.py
```

### Step 3: Create Service
```bash
# Create systemd service
sudo tee /etc/systemd/system/domain-manager.service << EOF
[Unit]
Description=Domain Manager
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/domain-manager
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl enable domain-manager
sudo systemctl start domain-manager
```

### Step 4: Configure Nginx
```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/domain-manager.conf << EOF
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/domain-manager.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Post-Installation

### Verify Installation
```bash
# Check service
sudo systemctl status domain-manager

# Test API
curl http://localhost:3001/api/domains

# View logs
sudo journalctl -u domain-manager -f
```

### Usage
1. Access web interface at your domain
2. Add domains through the interface
3. Run manual nginx commands after domain operations:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. Use your existing acme.sh scripts for SSL installation

### Security Notes
- The system uses only file operations
- No command execution or subprocess calls
- Manual steps required for actual server operations
- All domain validation prevents injection attacks

The interface will show your actual nginx configurations and SSL certificate status while maintaining complete security through file-only operations.