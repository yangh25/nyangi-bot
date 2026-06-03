import { useEffect, useRef, useState } from "react";

// Reveals a growing slice of a list as a sentinel scrolls into view, so long
// lists render incrementally instead of all at once. `resetKey` snaps the
// count back to the first chunk when the underlying list changes (e.g. a
// filter), even when the new list happens to be the same length.
export function useInfiniteScroll(total: number, step: number, resetKey?: unknown) {
  const [count, setCount] = useState(step);
  const [prevKey, setPrevKey] = useState(resetKey);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset during render (not in an effect) when the list identity changes.
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setCount(step);
  }

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || count >= total) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setCount((c) => Math.min(c + step, total));
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [count, total, step]);

  return { count, sentinelRef };
}
