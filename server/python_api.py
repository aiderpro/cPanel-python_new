#!/usr/bin/env python3

import json
import sys
from domain_manager import DomainManager

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "message": "No action specified"}))
        sys.exit(1)
    
    action = sys.argv[1]
    dm = DomainManager()
    
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
            
        elif action == "install_ssl":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "message": "Domain name required"}))
                sys.exit(1)
            
            domain_name = sys.argv[2]
            force_renewal = len(sys.argv) > 3 and sys.argv[3].lower() == "true"
            
            result = dm.install_ssl(domain_name, force_renewal)
            print(json.dumps(result))
            
        else:
            print(json.dumps({"success": False, "message": f"Unknown action: {action}"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"success": False, "message": f"Error: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()