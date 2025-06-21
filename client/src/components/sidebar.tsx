import { Globe, List, Plus, Shield, Settings, UserCircle } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-64 bg-white shadow-sm border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center">
          <Globe className="text-blue-600 mr-3 h-6 w-6" />
          Domain Manager
        </h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <a 
              href="#" 
              className="flex items-center px-4 py-3 text-slate-700 bg-blue-50 border-r-2 border-blue-600 rounded-l-lg font-medium"
            >
              <List className="mr-3 text-blue-600 h-5 w-5" />
              Domain List
            </a>
          </li>
          <li>
            <a 
              href="#" 
              className="flex items-center px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Plus className="mr-3 h-5 w-5" />
              Add Domain
            </a>
          </li>
          <li>
            <a 
              href="#" 
              className="flex items-center px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Shield className="mr-3 h-5 w-5" />
              SSL Certificates
            </a>
          </li>
          <li>
            <a 
              href="#" 
              className="flex items-center px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </a>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center text-sm text-slate-500">
          <UserCircle className="text-lg mr-2 h-5 w-5" />
          <span>admin@example.com</span>
        </div>
      </div>
    </div>
  );
}
