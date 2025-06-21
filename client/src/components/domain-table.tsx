import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Shield, Edit, Trash2, Search, RefreshCw, AlertTriangle, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { calculateDaysToExpire, getSSLStatusInfo } from "@/lib/utils";
import type { Domain } from "@shared/schema";

interface DomainTableProps {
  domains: Domain[];
  isLoading: boolean;
  onDeleteDomain: (domain: Domain) => void;
}

export default function DomainTable({ domains, isLoading, onDeleteDomain }: DomainTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const installSSLMutation = useMutation({
    mutationFn: async (domainId: number) => {
      return apiRequest("POST", `/api/domains/${domainId}/ssl`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/domains/stats"] });
      toast({
        title: "Success",
        description: "SSL certificate installed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to install SSL certificate",
        variant: "destructive",
      });
    },
  });

  const filteredDomains = domains.filter(domain =>
    domain.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
    queryClient.invalidateQueries({ queryKey: ["/api/domains/stats"] });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Domain List</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Domain List</h3>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search domains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-6 font-medium text-slate-700">Domain</th>
              <th className="text-left py-3 px-6 font-medium text-slate-700">SSL Status</th>
              <th className="text-left py-3 px-6 font-medium text-slate-700">Expiry Date</th>
              <th className="text-left py-3 px-6 font-medium text-slate-700">Days to Expire</th>
              <th className="text-left py-3 px-6 font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredDomains.map((domain) => {
              const daysToExpire = calculateDaysToExpire(domain.sslExpiryDate);
              const statusInfo = getSSLStatusInfo(domain.sslStatus);
              
              const renderIcon = () => {
                switch (statusInfo.iconName) {
                  case "Shield":
                    return <Shield className="mr-1 h-3 w-3" />;
                  case "AlertTriangle":
                    return <AlertTriangle className="mr-1 h-3 w-3" />;
                  case "XCircle":
                    return <XCircle className="mr-1 h-3 w-3" />;
                  case "X":
                    return <X className="mr-1 h-3 w-3" />;
                  default:
                    return null;
                }
              };
              
              return (
                <tr key={domain.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <Globe className="text-slate-400 mr-3 h-5 w-5" />
                      <span className="font-medium text-slate-800">{domain.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant={statusInfo.variant} className={statusInfo.className}>
                      {renderIcon()}
                      {statusInfo.label}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-slate-600">
                    {domain.sslExpiryDate || "-"}
                  </td>
                  <td className="py-4 px-6">
                    {domain.sslExpiryDate ? (
                      <span className={`font-medium ${
                        daysToExpire < 0 ? "text-red-600" :
                        daysToExpire <= 30 ? "text-amber-600" :
                        "text-emerald-600"
                      }`}>
                        {daysToExpire < 0 ? `${Math.abs(daysToExpire)} days ago` : `${daysToExpire} days`}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => installSSLMutation.mutate(domain.id)}
                        disabled={installSSLMutation.isPending}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteDomain(domain)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredDomains.length === 0 && (
          <div className="text-center py-12">
            <Globe className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-600">
              {searchTerm ? "No domains found matching your search" : "No domains added yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
