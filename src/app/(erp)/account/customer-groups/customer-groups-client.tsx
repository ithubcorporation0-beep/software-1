"use client";

import * as React from "react";
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { CustomerGroup } from "@/types/database.types";
import { CustomerSettingsTabs } from "@/components/customers/customer-settings-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface CustomerGroupsClientProps {
  companyId: string;
  initialGroups: CustomerGroup[];
  totalCustomers: number;
  totalCategories: number;
}

export function CustomerGroupsClient({
  companyId,
  initialGroups,
  totalCustomers,
  totalCategories,
}: CustomerGroupsClientProps) {
  const [groups, setGroups] = React.useState<CustomerGroup[]>(initialGroups);
  const [search, setSearch] = React.useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<CustomerGroup | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);

  // Toast feedback
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  React.useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormName("");
    setFormDesc("");
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (group: CustomerGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormDesc(group.description || "");
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError("Group name is required");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const { createCustomerGroup, updateCustomerGroup } = await import("@/lib/crm/customer-settings");
      if (editingGroup) {
        const res = await updateCustomerGroup(companyId, editingGroup.id, {
          name: formName,
          description: formDesc,
        });
        if (res.success && res.data) {
          setGroups((prev) => prev.map((g) => (g.id === editingGroup.id ? res.data! : g)));
          setIsModalOpen(false);
          setFeedback({ message: `Group '${res.data.name}' updated.`, type: "success" });
        } else {
          setModalError(res.error || "Failed to update group");
        }
      } else {
        const res = await createCustomerGroup(companyId, {
          name: formName,
          description: formDesc,
        });
        if (res.success && res.data) {
          setGroups((prev) => [res.data!, ...prev]);
          setIsModalOpen(false);
          setFeedback({ message: `Group '${res.data.name}' created.`, type: "success" });
        } else {
          setModalError(res.error || "Failed to create group");
        }
      }
    } catch (err: any) {
      setModalError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (group: CustomerGroup) => {
    if (!confirm(`Are you sure you want to delete customer group '${group.name}'?`)) return;

    try {
      const { deleteCustomerGroup } = await import("@/lib/crm/customer-settings");
      const res = await deleteCustomerGroup(companyId, group.id);
      if (res.success) {
        setGroups((prev) => prev.filter((g) => g.id !== group.id));
        setFeedback({ message: `Group '${group.name}' removed.`, type: "success" });
      } else {
        setFeedback({ message: res.error || "Could not delete group", type: "error" });
      }
    } catch (err: any) {
      setFeedback({ message: err.message || "Failed to delete group", type: "error" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border",
            feedback.type === "success"
              ? "bg-emerald-600 text-white border-emerald-700"
              : "bg-rose-600 text-white border-rose-700"
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-5 border-b border-border/80 bg-card/40 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
            <span>Accounting</span>
            <span>/</span>
            <span>Customers</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Customer Groups</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Customer Groups</span>
            <Badge variant="secondary" className="font-mono text-xs font-semibold px-2">
              {groups.length}
            </Badge>
          </h1>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={openCreateModal}
          className="gap-1.5 h-9 text-xs font-bold shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Customer Group</span>
        </Button>
      </div>

      {/* Navigation Sub-Tabs */}
      <CustomerSettingsTabs
        customersCount={totalCustomers}
        groupsCount={groups.length}
        categoriesCount={totalCategories}
      />

      {/* Search & Actions Bar */}
      <div className="p-6 pb-2">
        <div className="max-w-md relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups by title or description..."
            className="pl-9 text-xs h-9 bg-card"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 px-6 pb-6">
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground select-none">
                <th className="py-3 px-4">Group Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Assigned Customers</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FolderTree className="h-8 w-8 text-muted-foreground/40" />
                      <p className="font-semibold text-foreground">No customer groups found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20">
                          <FolderTree className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-foreground text-sm">{group.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-sm truncate">
                      {group.description || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5">
                        {group.customer_count ?? 0} customers
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(group.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(group)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(group)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
              <h3 className="text-base font-bold text-foreground">
                {editingGroup ? "Edit Customer Group" : "Add Customer Group"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-600 dark:text-red-400 font-medium">
                    {modalError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Group Name *</label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Wholesale Dealers"
                    required
                    className="h-9 text-xs"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Criteria or purpose of this customer group..."
                    rows={3}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="px-6 py-3 border-t border-border bg-card/60 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="default" size="sm" disabled={isSubmitting} className="gap-1.5">
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingGroup ? "Update Group" : "Create Group"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
