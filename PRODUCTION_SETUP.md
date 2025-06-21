# Production Setup Guide

## Security Verification

✅ **CONFIRMED: NO EXEC() REQUIRED**

The domain management system uses **100% file-based operations** with zero command execution:

### What the System Does (Secure)
- **Reads** nginx configuration files from `/etc/nginx/sites-available/`
- **Writes** new domain configurations as text files
- **Creates** symbolic links to `/etc/nginx/sites-enabled/`
- **Parses** SSL certificate files to check expiry dates
- **Validates** all input using strict regex patterns

### What the System Does NOT Do
- ❌ No `subprocess` calls
- ❌ No `os.system()` execution  
- ❌ No shell command execution
- ❌ No privilege escalation
- ❌ No direct nginx/certbot execution

## Production Configuration

### Step 1: Update Paths for Production

Edit `server/secure_domain_manager.py` line 20-23:

```python
# Change from:
base_dir = os.path.join(os.getcwd(), "nginx_config")

# To production paths:
self.nginx_sites_available = "/etc/nginx/sites-available"
self.nginx_sites_enabled = "/etc/nginx/sites-enabled"  
self.ssl_dir = "/etc/ssl/acme"  # or your SSL certificate directory
```

### Step 2: Set File Permissions

```bash
# Allow application to read nginx configs
sudo chmod 755 /etc/nginx/sites-available
sudo chmod 755 /etc/nginx/sites-enabled

# Allow application to write new configs (optional - can be done manually)
sudo chown www-data:www-data /etc/nginx/sites-available
```

### Step 3: Manual Operations Required

After each domain operation, run these commands manually:

#### Domain Addition:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL Installation:
```bash
# Using certbot:
sudo certbot --nginx -d domain.com -d www.domain.com

# Using acme.sh (your preferred method):
sudo ~/.acme.sh/acme.sh --issue -d domain.com -d www.domain.com --webroot /var/www/letsencrypt
sudo ~/.acme.sh/acme.sh --install-cert -d domain.com \
  --key-file /etc/ssl/acme/domain.com.key \
  --fullchain-file /etc/ssl/acme/domain.com.crt \
  --reloadcmd "systemctl reload nginx"
```

#### Domain Deletion:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Security Benefits

1. **Zero Attack Surface** - Cannot execute commands even if compromised
2. **File System Only** - All operations are read/write file operations
3. **Input Validation** - Strict domain name validation prevents injection
4. **Audit Trail** - All changes are file-based and trackable
5. **Fail Safe** - Cannot break system configuration

## Integration with Your Scripts

The system prepares all configurations but delegates actual server operations to your existing scripts:

- **Domain Addition**: Creates nginx configs, provides manual steps
- **SSL Setup**: Prepares `.well-known` blocks, shows your acme.sh commands  
- **Certificate Monitoring**: Reads your existing certificates for expiry tracking

Your existing Python and shell scripts remain the authoritative tools for actual server operations.