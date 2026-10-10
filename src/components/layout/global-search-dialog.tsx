"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Layers, ExternalLink } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { navigationConfig } from "./sidebar";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  // Extract all searchable items from navigationConfig
  const allItems = React.useMemo(() => {
    return navigationConfig.flatMap((section) =>
      section.items.map((item) => ({
        ...item,
        section: section.title,
      }))
    );
  }, []);

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return allItems;
    const lower = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.section.toLowerCase().includes(lower) ||
        (item.phase && item.phase.toLowerCase().includes(lower))
    );
  }, [query, allItems]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Search className="h-4 w-4 text-primary" />
            Universal Command & Navigation Palette
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, records, or documentation..."
            className="h-10 pl-9 text-sm"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No matching modules or commands found for &quot;{query}&quot;.
            </div>
          ) : (
            filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.href}
                  onClick={() => handleSelect(item.href)}
                  className="flex items-center justify-between rounded-md p-2 text-xs transition-colors hover:bg-muted cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="text-[10px] text-muted-foreground">{item.section}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.phase && (
                      <Badge variant="outline" className="text-[9px] h-4">
                        {item.phase}
                      </Badge>
                    )}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
          <span>Navigate with click or arrow keys</span>
          <span className="font-mono">ESC to close</span>
        </div>
      </div>
    </Dialog>
  );
}
