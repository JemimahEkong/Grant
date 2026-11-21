"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function LazyMount({
  children,
  priority = false,
  placeholderHeight = 210,
}: {
  children: ReactNode;
  priority?: boolean;
  placeholderHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(priority);

  useEffect(() => {
    if (mounted) return;
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <div
      ref={ref}
      className="lazy-mount"
      style={mounted ? undefined : { minHeight: placeholderHeight }}
    >
      {mounted ? children : <div className="lazy-placeholder" aria-hidden="true" />}
    </div>
  );
}
