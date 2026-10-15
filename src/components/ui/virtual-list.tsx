"use client";

import * as React from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  maxContainerHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

/**
 * Lightweight, zero-dependency DOM virtualizer for high-volume tabular rows.
 * Only mounts DOM nodes for visible viewport items (+ overscan buffer)
 * preventing DOM bloat and scroll jank when displaying > 200 records.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  maxContainerHeight = 480,
  renderItem,
  overscan = 5,
  className = "",
}: VirtualListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  const totalHeight = items.length * itemHeight;

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(maxContainerHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        maxHeight: `${maxContainerHeight}px`,
        overflowY: "auto",
        position: "relative",
      }}
      className={`scroll-smooth will-change-scroll ${className}`}
    >
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
}
