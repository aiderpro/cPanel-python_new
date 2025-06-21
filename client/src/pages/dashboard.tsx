import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import StatsCards from "@/components/stats-cards";
import DomainTable from "@/components/domain-table";
import AddDomainModal from "@/components/add-domain-modal";
import DeleteConfirmationModal from "@/components/delete-confirmation-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Domain } from "@shared/schema";

export default function Dashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null);

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["/api/domains"],
  });

  const handleDeleteDomain = (domain: Domain) => {
    setDomainToDelete(domain);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Domain Management</h2>
              <p className="text-slate-600 mt-1">Manage your domains and SSL certificates</p>
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <StatsCards />
          <DomainTable 
            domains={domains} 
            isLoading={isLoading}
            onDeleteDomain={handleDeleteDomain}
          />
        </main>
      </div>

      <AddDomainModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        domain={domainToDelete}
      />
    </div>
  );
}
