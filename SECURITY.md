# Security Documentation

## Security Model Overview

This domain management application uses a **secure file-based approach** that eliminates the need for exec() permissions or subprocess calls on production servers.

## Security Features

### 1. No Command Execution
- **Zero subprocess calls** - No use of `subprocess`, `os.system()`, or `exec()`
- **File operations only** - All domain management through direct file manipulation
- **No shell access** - Application cannot execute system commands

### 2. Input Validation & Sanitization
- **Domain name validation** - Strict regex patterns prevent injection
- **Path traversal protection** - Blocks `../` and invalid path components
- **Character filtering** - Only allows valid domain characters

### 3. File System Security
- **Sandboxed operations** - Only operates within designated nginx directories
- **Symlink validation** - Safe creation of nginx site links
- **Permission checks** - Validates file access before operations

## How It Works

### Domain Addition (Secure)
1. **Validate domain name** - Check format and security rules
2. **Generate nginx config** - Create configuration file content
3. **Write configuration** - Save to `/etc/nginx/sites-available/`
4. **Create symlink** - Link to `/etc/nginx/sites-enabled/`
5. **Return manual steps** - Provide commands for admin to run

### SSL Management (Secure)
1. **Prepare configuration** - Add `.well-known` location blocks
2. **Update nginx files** - File-based configuration updates
3. **Return manual steps** - Provide SSL installation commands
4. **Read certificate info** - Parse existing certificate files

### What Requires Manual Steps

Since we don't execute commands for security, certain operations require manual execution:

#### After Adding Domain:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### For SSL Installation:
```bash
sudo certbot --nginx -d domain.com -d www.domain.com
# OR
sudo ~/.acme.sh/acme.sh --issue -d domain.com -d www.domain.com --webroot /var/www/letsencrypt
```

#### After Domain Deletion:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Security Benefits

1. **No privilege escalation** - Application runs with minimal permissions
2. **No command injection** - Impossible since no commands are executed
3. **Audit trail** - All operations are file-based and logged
4. **Fail-safe** - Cannot break system even if exploited
5. **Compliance** - Meets strict security requirements

## Deployment Requirements

### Minimum Permissions Needed:
- Read access to `/etc/nginx/sites-available/`
- Write access to `/etc/nginx/sites-available/`
- Read/write access to `/etc/nginx/sites-enabled/`
- Read access to SSL certificate directories

### NOT Required:
- sudo permissions
- exec() capabilities
- shell access
- process spawning

## Manual Operations Required

The application provides the exact commands needed but requires manual execution for:
- Nginx configuration testing
- Nginx service reloading
- SSL certificate installation
- Certificate renewal

This design ensures maximum security while providing a user-friendly interface for domain management.