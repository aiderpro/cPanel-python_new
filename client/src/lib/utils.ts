import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDaysToExpire(expiryDate: string | null): number {
  if (!expiryDate) return 0;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function getSSLStatusInfo(status: string) {
  switch (status) {
    case "valid":
      return {
        label: "Valid",
        variant: "default" as const,
        className: "bg-emerald-100 text-emerald-700",
        iconName: "Shield" as const,
      };
    case "expiring_soon":
      return {
        label: "Expiring Soon",
        variant: "secondary" as const,
        className: "bg-amber-100 text-amber-700",
        iconName: "AlertTriangle" as const,
      };
    case "expired":
      return {
        label: "Expired",
        variant: "destructive" as const,
        className: "bg-red-100 text-red-700",
        iconName: "XCircle" as const,
      };
    case "no_ssl":
    default:
      return {
        label: "No SSL",
        variant: "outline" as const,
        className: "bg-slate-100 text-slate-700",
        iconName: "X" as const,
      };
  }
}
