#!/bin/bash

# Domain Manager Production Deployment Script
# Run this on your production server

set -e

echo "🚀 Starting Domain Manager deployment..."

# Configuration
APP_DIR="/var/www/domain-manager"
SERVICE_NAME="domain-manager"
NGINX_SITE="domain-manager"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "Please run this script as a regular user with sudo privileges"
   exit 1
fi

# Verify prerequisites
echo "📋 Checking prerequisites..."
command -v python3 >/dev/null 2>&1 || { echo "Python3 required but not installed"; exit 1; }
command -v nginx >/dev/null 2>&1 || { echo "Nginx required but not installed"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js required but not installed"; exit 1; }

if [ ! -f ~/.acme.sh/acme.sh ]; then
    echo "acme.sh not found. Please install it first"
    exit 1
fi

echo "✅ Prerequisites verified"

# Create directory structure
echo "📁 Creating directory structure..."
sudo mkdir -p $APP_DIR/{server,client,logs}
sudo chown -R $USER:$USER $APP_DIR

# Copy application files (assuming they're in current directory)
echo "📂 Copying application files..."
cp -r server/* $APP_DIR/server/
cp -r client/* $APP_DIR/client/
cp -r shared $APP_DIR/
cp package.json package-lock.json tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js $APP_DIR/

# Update Python script for production
echo "⚙️ Configuring for production..."
sed -i 's|base_dir = os.path.join(os.getcwd(), "nginx_config")|# Production paths|' $APP_DIR/server/secure_domain_manager.py
sed -i 's|self.nginx_sites_available = os.path.join(base_dir, "sites-available")|self.nginx_sites_available = "/etc/nginx/sites-available"|' $APP_DIR/server/secure_domain_manager.py
sed -i 's|self.nginx_sites_enabled = os.path.join(base_dir, "sites-enabled")|self.nginx_sites_enabled = "/etc/nginx/sites-enabled"|' $APP_DIR/server/secure_domain_manager.py
sed -i 's|self.ssl_dir = os.path.join(base_dir, "ssl")|self.ssl_dir = "/etc/ssl/acme"|' $APP_DIR/server/secure_domain_manager.py
sed -i 's|self._create_sample_data()|# self._create_sample_data()  # Disabled for production|' $APP_DIR/server/secure_domain_manager.py

# Set permissions
echo "🔐 Setting permissions..."
chmod +x $APP_DIR/server/secure_api.py
chmod +x $APP_DIR/server/secure_domain_manager.py
sudo chown www-data:www-data /etc/nginx/sites-available
sudo chmod 755 /etc/nginx/sites-available /etc/nginx/sites-enabled

# Install dependencies and build
echo "📦 Installing dependencies..."
cd $APP_DIR
npm install
npm run build

# Create environment file
echo "📝 Creating environment configuration..."
cat > $APP_DIR/.env << EOF
NODE_ENV=production
PORT=3001
EOF

# Create systemd service
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << EOF
[Unit]
Description=Domain Manager Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create nginx configuration
read -p "Enter your domain name for the web interface (e.g., domains.yourserver.com): " DOMAIN_NAME

echo "🌐 Creating nginx configuration..."
sudo tee /etc/nginx/sites-available/$NGINX_SITE.conf > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/$NGINX_SITE.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Set final permissions
sudo chown -R www-data:www-data $APP_DIR
sudo chmod 750 $APP_DIR
sudo chmod 640 $APP_DIR/server/*.py

# Enable and start service
echo "🚀 Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl start $SERVICE_NAME

# Wait a moment for service to start
sleep 3

# Check service status
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ Service started successfully!"
else
    echo "❌ Service failed to start. Check logs:"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 20
    exit 1
fi

# Test the installation
echo "🧪 Testing installation..."
if curl -s http://localhost:3001/api/domains > /dev/null; then
    echo "✅ API is responding"
else
    echo "❌ API test failed"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Install SSL for the domain manager interface:"
echo "   sudo certbot --nginx -d $DOMAIN_NAME"
echo ""
echo "2. Access your domain manager at: http://$DOMAIN_NAME"
echo ""
echo "3. To manage domains:"
echo "   - Add domains through the web interface"
echo "   - After adding: sudo nginx -t && sudo systemctl reload nginx"
echo "   - For SSL: Use your existing acme.sh scripts"
echo ""
echo "4. Monitor the service:"
echo "   sudo systemctl status $SERVICE_NAME"
echo "   sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "🔒 Security: The system uses only file operations - no command execution!"