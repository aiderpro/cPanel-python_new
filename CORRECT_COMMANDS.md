# Correct Commands for Production Fix

## You're in: `/var/www/nginx-control-panel/server`

Run these commands from your current location:

```bash
# Test the Python scripts (you're already in server directory)
python3 production_api.py list
python3 production_api.py stats

# Make scripts executable
chmod +x production_api.py
chmod +x production_domain_manager.py

# Go back to main directory to rebuild
cd /var/www/nginx-control-panel
npm run build

# Restart the service
sudo systemctl restart domain-manager

# Test the API
curl http://localhost:3001/api/domains
curl http://localhost:3001/api/domains/stats
```

## If Files Don't Exist

The production files might not be uploaded yet. Create them:

**Create `/var/www/nginx-control-panel/server/production_api.py`:**
```python
#!/usr/bin/env python3

import json
import sys
from production_domain_manager import ProductionDomainManager

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "message": "No action specified"}))
        sys.exit(1)
    
    action = sys.argv[1]
    dm = ProductionDomainManager()
    
    try:
        if action == "list":
            domains = dm.list_domains()
            print(json.dumps({"success": True, "data": domains}))
            
        elif action == "stats":
            stats = dm.get_domain_stats()
            print(json.dumps({"success": True, "data": stats}))
            
        elif action == "add":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "message": "Domain name required"}))
                sys.exit(1)
            
            domain_name = sys.argv[2]
            install_ssl = len(sys.argv) > 3 and sys.argv[3].lower() == "true"
            
            result = dm.add_domain(domain_name, install_ssl)
            print(json.dumps(result))
            
        elif action == "delete":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "message": "Domain name required"}))
                sys.exit(1)
            
            domain_name = sys.argv[2]
            result = dm.delete_domain(domain_name)
            print(json.dumps(result))
            
        elif action == "prepare_ssl":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "message": "Domain name required"}))
                sys.exit(1)
            
            domain_name = sys.argv[2]
            result = dm.prepare_ssl_config(domain_name)
            print(json.dumps(result))
            
        else:
            print(json.dumps({"success": False, "message": f"Unknown action: {action}"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"success": False, "message": f"Error: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

**Create `/var/www/nginx-control-panel/server/production_domain_manager.py`:**
Copy the content from the development environment.

## Quick Test After Fix

```bash
# From /var/www/nginx-control-panel/server
python3 production_api.py list

# Expected output:
# {"success": true, "data": [...]}
```