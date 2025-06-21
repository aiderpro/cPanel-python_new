#!/usr/bin/env python3

import os
import glob
import json
import re
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

class SecureDomainManager:
    """
    Secure domain manager that works with file operations only.
    No subprocess calls or command execution - purely file-based operations.
    """
    
    def __init__(self):
        # Use local directories for development/testing
        # In production, these would point to actual nginx directories
        base_dir = os.path.join(os.getcwd(), "nginx_config")
        self.nginx_sites_available = os.path.join(base_dir, "sites-available")
        self.nginx_sites_enabled = os.path.join(base_dir, "sites-enabled")
        self.ssl_dir = os.path.join(base_dir, "ssl")
        
        # Create directories for testing
        os.makedirs(self.nginx_sites_available, exist_ok=True)
        os.makedirs(self.nginx_sites_enabled, exist_ok=True)
        os.makedirs(self.ssl_dir, exist_ok=True)
        
        # Add some sample data for demonstration
        self._create_sample_data()

    def _create_sample_data(self):
        """Create sample domain configurations for demonstration"""
        sample_domains = [
            {
                "name": "example.com",
                "ssl_status": "valid",
                "days_left": 45
            },
            {
                "name": "blog.example.com", 
                "ssl_status": "expiring_soon",
                "days_left": 15
            },
            {
                "name": "old.example.com",
                "ssl_status": "expired", 
                "days_left": -5
            },
            {
                "name": "shop.example.com",
                "ssl_status": "no_ssl",
                "days_left": 0
            }
        ]
        
        for domain in sample_domains:
            # Create nginx config
            config_path = os.path.join(self.nginx_sites_available, f"{domain['name']}.conf")
            if not os.path.exists(config_path):
                config = self.generate_nginx_config(domain['name'])
                with open(config_path, 'w') as f:
                    f.write(config)
                
                # Create enabled symlink
                enabled_path = os.path.join(self.nginx_sites_enabled, f"{domain['name']}.conf")
                if not os.path.exists(enabled_path):
                    os.symlink(config_path, enabled_path)
            
            # Create SSL certificate file if has SSL
            if domain['ssl_status'] != 'no_ssl':
                cert_path = os.path.join(self.ssl_dir, f"{domain['name']}.crt")
                if not os.path.exists(cert_path):
                    # Create dummy certificate file with timestamp for expiry calculation
                    cert_content = f"# Sample certificate for {domain['name']}\n"
                    with open(cert_path, 'w') as f:
                        f.write(cert_content)
                    
                    # Set file timestamp to simulate expiry
                    if domain['days_left'] > 0:
                        # Certificate expires in future
                        future_time = datetime.now().timestamp() - (90 - domain['days_left']) * 86400
                    else:
                        # Certificate already expired
                        future_time = datetime.now().timestamp() - (90 + abs(domain['days_left'])) * 86400
                    
                    os.utime(cert_path, (future_time, future_time))

    def validate_domain_name(self, domain: str) -> bool:
        """Validate domain name format for security"""
        # Only allow valid domain characters
        pattern = r'^[a-zA-Z0-9][a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9]$'
        if not re.match(pattern, domain):
            return False
        
        # Prevent path traversal
        if '..' in domain or '/' in domain or '\\' in domain:
            return False
            
        return True

    def generate_nginx_config(self, server_name: str) -> str:
        """Generate nginx configuration for domain"""
        if not self.validate_domain_name(server_name):
            raise ValueError("Invalid domain name")
            
        config = f'''server {{
    listen 80;
    server_name {server_name} www.{server_name};
    root /data/site/public;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    index index.php index.html index.htm;
    charset utf-8;
    
    location / {{
        proxy_read_timeout     60;
        proxy_connect_timeout  60;
        proxy_redirect off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        proxy_set_header Host $host ;
        proxy_set_header X-Real-IP $remote_addr ;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for ;
        proxy_set_header X-Forwarded-Proto https;
        proxy_pass             http://localhost:3000;
    }}
    
    location @rules {{
        rewrite ^(.*)$ $1.php last;
    }}
    
    location = /favicon.ico {{
        access_log off;
        log_not_found off;
    }}
    
    location = /robots.txt {{
        access_log off;
        log_not_found off;
    }}
    
    error_page 404 /index.php;
    
    location ~ \.php$ {{
        fastcgi_pass unix:/var/run/php-fpm/www.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }}
    
    location ~ /\.(?!well-known).* {{
        deny all;
    }}
}}
'''
        return config

    def add_domain(self, server_name: str, install_ssl: bool = False) -> Dict:
        """Add new domain with nginx configuration (file operations only)"""
        try:
            if not self.validate_domain_name(server_name):
                return {"success": False, "message": "Invalid domain name format"}

            # Check if domain already exists
            file_path = os.path.join(self.nginx_sites_available, f"{server_name}.conf")
            if os.path.exists(file_path):
                return {"success": False, "message": f"Domain {server_name} already exists"}

            # Generate and write nginx configuration
            config = self.generate_nginx_config(server_name)
            with open(file_path, 'w') as f:
                f.write(config)

            # Create symbolic link to sites-enabled
            link_path = os.path.join(self.nginx_sites_enabled, f"{server_name}.conf")
            if not os.path.exists(link_path):
                os.symlink(file_path, link_path)

            result = {
                "success": True, 
                "message": f"Domain {server_name} configuration created. Manual nginx reload required.",
                "domain": server_name,
                "manual_steps": [
                    "Run: sudo nginx -t",
                    "Run: sudo systemctl reload nginx"
                ]
            }

            if install_ssl:
                result["ssl_message"] = "SSL configuration prepared. Manual SSL installation required."
                result["ssl_steps"] = [
                    f"Run: sudo certbot --nginx -d {server_name} -d www.{server_name}",
                    "Or use your acme.sh script for SSL installation"
                ]

            return result

        except Exception as e:
            return {"success": False, "message": f"Error adding domain: {str(e)}"}

    def get_ssl_expiry_info(self, domain: str) -> Dict:
        """Get SSL certificate expiry information from certificate files"""
        if not self.validate_domain_name(domain):
            return {"has_ssl": False, "status": "no_ssl"}
            
        cert_path = os.path.join(self.ssl_dir, f"{domain}.crt")
        
        if not os.path.exists(cert_path):
            return {"has_ssl": False, "status": "no_ssl"}

        try:
            # Read certificate file and extract expiry date
            with open(cert_path, 'r') as f:
                cert_content = f.read()
            
            # For demonstration - in real implementation, you'd parse the certificate
            # This is a simplified version that reads from file timestamps
            stat = os.stat(cert_path)
            cert_age_days = (datetime.now().timestamp() - stat.st_mtime) / 86400
            
            # Simulate certificate expiry (90 days from creation)
            days_left = 90 - int(cert_age_days)
            
            if days_left < 0:
                status = "expired"
            elif days_left <= 30:
                status = "expiring_soon"
            else:
                status = "valid"

            expiry_date = datetime.fromtimestamp(stat.st_mtime + (90 * 86400))

            return {
                "has_ssl": True,
                "status": status,
                "expiry_date": expiry_date.strftime('%Y-%m-%d'),
                "days_left": max(0, days_left)
            }

        except Exception as e:
            return {"has_ssl": False, "status": "no_ssl"}

    def list_domains(self) -> List[Dict]:
        """List all domains from nginx sites-available (file operations only)"""
        domains = []
        
        try:
            # Get all .conf files from sites-available
            pattern = os.path.join(self.nginx_sites_available, "*.conf")
            conf_files = glob.glob(pattern)
            
            for conf_file in conf_files:
                # Extract domain name from filename
                domain_name = os.path.basename(conf_file).replace('.conf', '')
                
                # Skip default nginx configs
                if domain_name in ['default', 'default-ssl']:
                    continue
                
                # Validate domain name
                if not self.validate_domain_name(domain_name):
                    continue
                
                # Check if enabled
                enabled_path = os.path.join(self.nginx_sites_enabled, f"{domain_name}.conf")
                is_enabled = os.path.exists(enabled_path)
                
                # Get SSL information
                ssl_info = self.get_ssl_expiry_info(domain_name)
                
                domain_info = {
                    "id": len(domains) + 1,
                    "name": domain_name,
                    "enabled": is_enabled,
                    "sslStatus": ssl_info["status"],
                    "sslExpiryDate": ssl_info.get("expiry_date"),
                    "daysToExpire": ssl_info.get("days_left"),
                    "createdAt": datetime.fromtimestamp(os.path.getctime(conf_file)).isoformat()
                }
                
                domains.append(domain_info)
                
        except Exception as e:
            print(f"Error listing domains: {e}")
            
        return domains

    def delete_domain(self, domain_name: str) -> Dict:
        """Delete domain configuration (file operations only)"""
        try:
            if not self.validate_domain_name(domain_name):
                return {"success": False, "message": "Invalid domain name format"}

            conf_file = os.path.join(self.nginx_sites_available, f"{domain_name}.conf")
            enabled_file = os.path.join(self.nginx_sites_enabled, f"{domain_name}.conf")
            
            # Check if domain exists
            if not os.path.exists(conf_file):
                return {"success": False, "message": f"Domain {domain_name} not found"}

            # Remove from sites-enabled first
            if os.path.exists(enabled_file):
                os.remove(enabled_file)

            # Remove from sites-available
            os.remove(conf_file)

            return {
                "success": True, 
                "message": f"Domain {domain_name} configuration deleted. Manual nginx reload required.",
                "manual_steps": [
                    "Run: sudo nginx -t",
                    "Run: sudo systemctl reload nginx"
                ]
            }

        except Exception as e:
            return {"success": False, "message": f"Error deleting domain: {str(e)}"}

    def prepare_ssl_config(self, domain: str) -> Dict:
        """Prepare SSL configuration (file operations only)"""
        try:
            if not self.validate_domain_name(domain):
                return {"success": False, "message": "Invalid domain name format"}

            conf_file = os.path.join(self.nginx_sites_available, f"{domain}.conf")
            
            if not os.path.exists(conf_file):
                return {"success": False, "message": f"Domain configuration not found"}

            # Read current configuration
            with open(conf_file, 'r') as f:
                config = f.read()

            # Add well-known location if missing
            if ".well-known/acme-challenge" not in config:
                lines = config.split('\n')
                for i, line in enumerate(lines):
                    if f"server_name {domain}" in line:
                        well_known_block = [
                            "    location ^~ /.well-known/acme-challenge/ {",
                            "        root /var/www/letsencrypt;",
                            '        default_type "text/plain";',
                            "        try_files $uri =404;",
                            "    }"
                        ]
                        lines[i+1:i+1] = well_known_block
                        break

                with open(conf_file, 'w') as f:
                    f.write('\n'.join(lines))

            return {
                "success": True,
                "message": f"SSL preparation completed for {domain}",
                "manual_steps": [
                    "Run: sudo nginx -t",
                    "Run: sudo systemctl reload nginx",
                    f"Run: sudo certbot --nginx -d {domain} -d www.{domain}",
                    "Or use your acme.sh script for SSL installation"
                ]
            }

        except Exception as e:
            return {"success": False, "message": f"Error preparing SSL: {str(e)}"}

    def get_domain_stats(self) -> Dict:
        """Get statistics about domains and SSL certificates"""
        domains = self.list_domains()
        
        total_domains = len(domains)
        active_ssl = len([d for d in domains if d["sslStatus"] == "valid"])
        expiring_soon = len([d for d in domains if d["sslStatus"] == "expiring_soon"])
        expired = len([d for d in domains if d["sslStatus"] == "expired"])
        
        return {
            "totalDomains": total_domains,
            "activeSsl": active_ssl,
            "expiringSoon": expiring_soon,
            "expired": expired
        }