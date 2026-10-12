"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Layers, Users, Package, FileText, Briefcase, CheckSquare, Truck, AlertCircle } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Employees" | "Customers" | "Invoices" | "Products" | "Projects" | "Tasks" | "Suppliers";
  href?: string;
  badge?: string;
  isAvailable: boolean;
}

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchResults("");
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const fetchResults = React.useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // Ignore network aborts in palette
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    fetchResults(val);
  };

  const handleSelect = (item: SearchResultItem) => {
    if (!item.isAvailable || !item.href) return;
    onOpenChange(false);
    router.push(item.href);
  };

  // Group results by category
  const grouped = React.useMemo(() => {
    const map = new Map<string, SearchResultItem[]>();
    for (const item of results) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [results]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Employees":
        return Users;
      case "Products":
        return Package;
      case "Invoices":
        return FileText;
      case "Projects":
        return Briefcase;
      case "Tasks":
        return CheckSquare;
      case "Suppliers":
        return Truck;
      default:
        return Layers;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Search className="h-4 w-4 text-primary" />
            Universal Command & Categorized Search
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            placeholder="Search modules, employees, invoices, products, tasks..."
            className="h-10 pl-9 pr-8 text-sm"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          {isLoading && (
            <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
          {results.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching tenant records or commands found for &quot;{query}&quot;.
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => {
              const CategoryIcon = getCategoryIcon(category);
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <CategoryIcon className="h-3 w-3" />
                    {category}
                  </div>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`flex items-center justify-between rounded-md p-2 text-xs transition-colors ${
                        item.isAvailable
                          ? "hover:bg-muted cursor-pointer"
                          : "opacity-75 bg-muted/20 cursor-default"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground shrink-0">
                          <CategoryIcon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            {item.title}
                            {item.badge && (
                              <Badge variant={item.isAvailable ? "secondary" : "outline"} className="text-[9px] h-4">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{item.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.isAvailable ? (
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-4 text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
          <span>Tenant-scoped & permission verified</span>
          <span className="font-mono">ESC to dismiss</span>
        </div>
      </div>
    </Dialog>
  );
}
