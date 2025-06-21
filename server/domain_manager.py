#!/usr/bin/env python3

import subprocess
import os
import glob
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

class DomainManager:
    def __init__(self):
        self.nginx_sites_available = "/etc/nginx/sites-available"
        self.nginx_sites_enabled = "/etc/nginx/sites-enabled"
        self.ssl_dir = "/etc/ssl/acme"
        self.webroot = "/var/www/letsencrypt"
        self.acme_home = "/root/.acme.sh"

    def execute_command(self, command: str) -> Tuple[int, str]:
        """Execute shell command and return exit code and output"""
        try:
            process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            output, _ = process.communicate()
            return process.returncode, output.decode()
        except Exception as e:
            return 1, str(e)

    def test_nginx(self) -> bool:
        """Test nginx configuration"""
        return_code, output = self.execute_command('sudo nginx -t')
        return return_code == 0

    def reload_nginx(self) -> bool:
        """Reload nginx service"""
        if not self.test_nginx():
            return False
        return_code, output = self.execute_command('sudo systemctl reload nginx')
        return return_code == 0

    def generate_nginx_config(self, server_name: str) -> str:
        """Generate nginx configuration for domain"""
        config = f'''server {{
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
        """Add new domain with nginx configuration"""
        try:
            # Check if domain already exists
            file_path = f'{self.nginx_sites_available}/{server_name}.conf'
            if os.path.exists(file_path):
                return {"success": False, "message": f"Domain {server_name} already exists"}

            # Generate and write nginx configuration
            config = self.generate_nginx_config(server_name)
            with open(file_path, 'w') as f:
                f.write(config)

            # Create symbolic link to sites-enabled
            link_path = f'{self.nginx_sites_enabled}/{server_name}.conf'
            if not os.path.exists(link_path):
                os.symlink(file_path, link_path)

            # Test and reload nginx
            if not self.reload_nginx():
                # Cleanup on failure
                if os.path.exists(file_path):
                    os.remove(file_path)
                if os.path.exists(link_path):
                    os.remove(link_path)
                return {"success": False, "message": "Failed to reload nginx"}

            result = {
                "success": True, 
                "message": f"Domain {server_name} added successfully",
                "domain": server_name
            }

            # Install SSL if requested
            if install_ssl:
                ssl_result = self.install_ssl(server_name)
                result["ssl_installed"] = ssl_result["success"]
                if not ssl_result["success"]:
                    result["ssl_message"] = ssl_result["message"]

            return result

        except Exception as e:
            return {"success": False, "message": f"Error adding domain: {str(e)}"}

    def get_ssl_expiry_info(self, domain: str) -> Dict:
        """Get SSL certificate expiry information"""
        cert_path = f"{self.ssl_dir}/{domain}.crt"
        
        if not os.path.exists(cert_path):
            return {"has_ssl": False, "status": "no_ssl"}

        try:
            # Get certificate expiry date
            return_code, output = self.execute_command(
                f'openssl x509 -enddate -noout -in "{cert_path}" | cut -d= -f2'
            )
            
            if return_code != 0:
                return {"has_ssl": False, "status": "no_ssl"}

            # Parse expiry date
            expiry_str = output.strip()
            expiry_date = datetime.strptime(expiry_str, '%b %d %H:%M:%S %Y %Z')
            
            # Calculate days remaining
            now = datetime.now()
            days_left = (expiry_date - now).days
            
            # Determine status
            if days_left < 0:
                status = "expired"
            elif days_left <= 30:
                status = "expiring_soon"
            else:
                status = "valid"

            return {
                "has_ssl": True,
                "status": status,
                "expiry_date": expiry_date.strftime('%Y-%m-%d'),
                "days_left": days_left
            }

        except Exception as e:
            return {"has_ssl": False, "status": "no_ssl"}

    def list_domains(self) -> List[Dict]:
        """List all domains from nginx sites-available"""
        domains = []
        
        try:
            # Get all .conf files from sites-available
            conf_files = glob.glob(f"{self.nginx_sites_available}/*.conf")
            
            for conf_file in conf_files:
                # Extract domain name from filename
                domain_name = os.path.basename(conf_file).replace('.conf', '')
                
                # Skip default nginx configs
                if domain_name in ['default', 'default-ssl']:
                    continue
                
                # Check if enabled
                enabled_path = f"{self.nginx_sites_enabled}/{domain_name}.conf"
                is_enabled = os.path.exists(enabled_path)
                
                # Get SSL information
                ssl_info = self.get_ssl_expiry_info(domain_name)
                
                domain_info = {
                    "id": len(domains) + 1,  # Simple ID for frontend
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
        """Delete domain configuration from nginx"""
        try:
            conf_file = f"{self.nginx_sites_available}/{domain_name}.conf"
            enabled_file = f"{self.nginx_sites_enabled}/{domain_name}.conf"
            
            # Check if domain exists
            if not os.path.exists(conf_file):
                return {"success": False, "message": f"Domain {domain_name} not found"}

            # Remove from sites-enabled first
            if os.path.exists(enabled_file):
                os.remove(enabled_file)

            # Remove from sites-available
            os.remove(conf_file)

            # Test and reload nginx
            if not self.reload_nginx():
                return {"success": False, "message": "Domain deleted but nginx reload failed"}

            return {
                "success": True, 
                "message": f"Domain {domain_name} deleted successfully"
            }

        except Exception as e:
            return {"success": False, "message": f"Error deleting domain: {str(e)}"}

    def install_ssl(self, domain: str, force_renewal: bool = False) -> Dict:
        """Install SSL certificate using acme.sh"""
        try:
            ssl_dir = self.ssl_dir
            cert_path = f"{ssl_dir}/{domain}.crt"
            conf_file = f"{self.nginx_sites_available}/{domain}.conf"

            # Check if nginx conf exists
            if not os.path.exists(conf_file):
                return {"success": False, "message": f"NGINX conf not found at {conf_file}"}

            # Check existing certificate
            if os.path.exists(cert_path) and not force_renewal:
                ssl_info = self.get_ssl_expiry_info(domain)
                if ssl_info.get("days_left", 0) > 30:
                    return {
                        "success": False, 
                        "message": f"Certificate has {ssl_info['days_left']} days left. Use force renewal if needed."
                    }

            # Ensure acme.sh is installed
            if not os.path.exists(f"{self.acme_home}/acme.sh"):
                return_code, output = self.execute_command(
                    "curl https://get.acme.sh | sh"
                )
                if return_code != 0:
                    return {"success": False, "message": "Failed to install acme.sh"}

            # Ensure webroot exists
            os.makedirs(self.webroot, exist_ok=True)
            self.execute_command(f"chown -R nginx:nginx {self.webroot}")

            # Add well-known location block if missing
            with open(conf_file, 'r') as f:
                config_content = f.read()

            if ".well-known/acme-challenge" not in config_content:
                # Find the line with server_name and add location block after it
                lines = config_content.split('\n')
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

            # Reload nginx for challenge handling
            if not self.reload_nginx():
                return {"success": False, "message": "Failed to reload nginx for challenge setup"}

            # Issue certificate using acme.sh
            acme_command = f"{self.acme_home}/acme.sh --issue -d {domain} -d www.{domain} --webroot {self.webroot}"
            
            if force_renewal:
                acme_command += " --force"

            return_code, output = self.execute_command(acme_command)
            
            if return_code != 0:
                return {"success": False, "message": f"Certificate issue failed: {output}"}

            # Install certificate to custom location
            os.makedirs(ssl_dir, exist_ok=True)
            install_command = f"""
            {self.acme_home}/acme.sh --install-cert -d {domain} \
            --key-file {ssl_dir}/{domain}.key \
            --fullchain-file {ssl_dir}/{domain}.crt \
            --reloadcmd "systemctl reload nginx"
            """
            
            return_code, output = self.execute_command(install_command)
            if return_code != 0:
                return {"success": False, "message": f"Certificate installation failed: {output}"}

            # Update nginx config with SSL
            with open(conf_file, 'r') as f:
                config_content = f.read()

            if f"ssl_certificate {ssl_dir}/{domain}.crt" not in config_content:
                lines = config_content.split('\n')
                for i, line in enumerate(lines):
                    if f"server_name {domain}" in line:
                        ssl_config = [
                            "    listen 443 ssl;",
                            f"    ssl_certificate {ssl_dir}/{domain}.crt;",
                            f"    ssl_certificate_key {ssl_dir}/{domain}.key;"
                        ]
                        lines[i+1:i+1] = ssl_config
                        break

                with open(conf_file, 'w') as f:
                    f.write('\n'.join(lines))

            # Final test and reload
            if not self.reload_nginx():
                return {"success": False, "message": "SSL installed but nginx reload failed"}

            return {
                "success": True,
                "message": f"SSL certificate installed successfully for {domain}"
            }

        except Exception as e:
            return {"success": False, "message": f"Error installing SSL: {str(e)}"}

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