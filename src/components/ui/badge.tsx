import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: "default" | "success" | "warning" | "danger" | "muted" }) {
  const variants = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)} {...props} />
  );
}

export function statusVariant(status: string) {
  if (["ACTIVATED", "ACTIVE", "PAID"].includes(status)) return "success" as const;
  if (["STK_SENT", "ACTIVATING", "QUEUED", "PENDING", "INITIATED"].includes(status)) return "warning" as const;
  if (["FAILED", "STK_FAILED", "ACTIVATION_FAILED", "REVOKED", "EXPIRED"].includes(status)) return "danger" as const;
  return "muted" as const;
}
