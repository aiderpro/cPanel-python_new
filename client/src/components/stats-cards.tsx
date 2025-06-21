import { useQuery } from "@tanstack/react-query";
import { Globe, Shield, AlertTriangle, XCircle } from "lucide-react";

interface Stats {
  totalDomains: number;
  activeSsl: number;
  expiringSoon: number;
  expired: number;
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/domains/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="animate-pulse">
              <div className="h-12 w-12 bg-slate-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-slate-200 rounded mb-2"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Globe className="text-blue-600 h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-slate-600">Total Domains</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.totalDomains || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <Shield className="text-emerald-600 h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-slate-600">Active SSL</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.activeSsl || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center">
          <div className="p-3 bg-amber-50 rounded-lg">
            <AlertTriangle className="text-amber-600 h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-slate-600">Expiring Soon</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.expiringSoon || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center">
          <div className="p-3 bg-red-50 rounded-lg">
            <XCircle className="text-red-600 h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-slate-600">Expired</p>
            <p className="text-2xl font-bold text-slate-800">{stats?.expired || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
