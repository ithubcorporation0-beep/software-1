"use client";

import * as React from "react";
import { X, FolderPlus, Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCustomerGroupAction,
  createCustomerCategoryAction,
} from "@/app/(erp)/account/customers/actions";

export interface QuickCreateModalProps {
  open: boolean;
  type: "customer_group" | "customer_category";
  onClose: () => void;
  onSuccess: (name: string) => void;
  companyId: string;
}

export function QuickCreateModal({
  open,
  type,
  onClose,
  onSuccess,
  companyId,
}: QuickCreateModalProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const isGroup = type === "customer_group";
  const title = isGroup ? "Add Customer Group" : "Add Customer Category";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = isGroup
        ? await createCustomerGroupAction(companyId, { name, description })
        : await createCustomerCategoryAction(companyId, { name, description });

      if (res.success && res.data) {
        onSuccess(res.data.name);
        onClose();
      } else {
        setError(res.error || "Failed to create");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              {isGroup ? <FolderPlus className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">Quick-create option for customer profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {isGroup ? "Group Name *" : "Category Name *"}
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isGroup ? "e.g. Wholesale Dealers" : "e.g. VIP Key Accounts"}
                required
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief purpose or criteria..."
                rows={3}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="px-6 py-3 border-t border-border bg-card/60 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save & Select</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
