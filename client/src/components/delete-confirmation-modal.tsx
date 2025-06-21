import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { Domain } from "@shared/schema";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: Domain | null;
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  domain 
}: DeleteConfirmationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: number) => {
      return apiRequest("DELETE", `/api/domains/${domainId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/domains/stats"] });
      toast({
        title: "Success",
        description: "Domain deleted successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete domain",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (domain) {
      deleteDomainMutation.mutate(domain.id);
    }
  };

  if (!domain) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-red-100 rounded-full mr-4">
              <AlertTriangle className="text-red-600 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Delete Domain</h3>
              <p className="text-slate-600">This action cannot be undone</p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">
              <strong>Warning:</strong> This will remove the domain{" "}
              <span className="font-mono font-medium">{domain.name}</span>{" "}
              and SSL certificate associated with this domain and cannot be undone.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDomainMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteDomainMutation.isPending ? "Deleting..." : "Delete Domain"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
