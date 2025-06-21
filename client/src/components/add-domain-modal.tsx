import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertDomainSchema, type InsertDomain } from "@shared/schema";
import { Plus, X } from "lucide-react";

interface AddDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddDomainModal({ isOpen, onClose }: AddDomainModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertDomain>({
    resolver: zodResolver(insertDomainSchema),
    defaultValues: {
      name: "",
      sslStatus: "no_ssl",
      sslExpiryDate: null,
      installSsl: false,
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: async (data: InsertDomain) => {
      return apiRequest("POST", "/api/domains", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/domains/stats"] });
      toast({
        title: "Success",
        description: "Domain added successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add domain",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDomain) => {
    addDomainMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add New Domain
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example.com"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-sm text-slate-500">
                    Enter the domain name without http:// or https://
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="installSsl"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Install SSL certificate automatically
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addDomainMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                {addDomainMutation.isPending ? "Adding..." : "Add Domain"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
