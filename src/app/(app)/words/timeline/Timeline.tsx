"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Category } from "@prisma/client";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/categories";
import { useHanjaMeanings } from "@/components/useHanjaMeanings";
import HanjaText from "@/components/HanjaText";

interface Entry {
  id: string;
  createdAt: string | Date;
  word: {
    korean: string;
    hanja: string | null;
    category: Category;
    definitionKo: string | null;
    definitionEn: string | null;
  };
}

export default function Timeline({
  initialEntries,
  initialCursor,
}: {
  initialEntries: Entry[];
  initialCursor: string | null;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [error, setError] = useState(false);
  const meanings = useHanjaMeanings(entries.map((e) => e.word.hanja));
  const cursorRef = useRef(initialCursor);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch the next slice from the cursor. Guarded so only one request is in
  // flight, and a no-op once the cursor reaches the end of the list.
  const loadMore = useCallback(async () => {
    if (loadingRef.current || cursorRef.current === null) return;
    loadingRef.current = true;
    setError(false);
    try {
      const res = await fetch(`/api/timeline?cursor=${encodeURIComponent(cursorRef.current)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries((prev) => [...prev, ...data.entries]);
      cursorRef.current = data.nextCursor ?? null;
    } catch {
      setError(true); // cursor is untouched, so retry resumes from the same spot
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (obs) => {
        if (obs[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  // Group the loaded entries by the calendar day a word was added (already
  // newest-first).
  const groups: { key: string; label: string; entries: Entry[] }[] = [];
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = date.toDateString();
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = {
        key,
        label: date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        entries: [],
      };
      groups.push(group);
    }
    group.entries.push(entry);
  }

  return (
    <div>
      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-sm font-semibold text-stone-700">{group.label}</h2>
              <span className="text-xs text-stone-400">
                {group.entries.length} word{group.entries.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-2">
              {group.entries.map((entry) => {
                const { word } = entry;
                return (
                  <div key={entry.id} className="bg-white border border-stone-200 rounded-xl p-4">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg font-bold text-stone-800">{word.korean}</span>
                      {word.hanja && (
                        <HanjaText hanja={word.hanja} meanings={meanings} className="text-sm text-stone-400" />
                      )}
                      <span
                        className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[word.category]}`}
                      >
                        {CATEGORY_LABELS[word.category]}
                      </span>
                    </div>
                    {word.definitionKo && (
                      <p className="text-sm text-stone-700 mt-1 whitespace-pre-line">{word.definitionKo}</p>
                    )}
                    {word.definitionEn && <p className="text-sm text-stone-500">{word.definitionEn}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} aria-hidden />
      {error && (
        <button
          type="button"
          onClick={loadMore}
          className="mt-4 mx-auto block text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          Couldn&apos;t load more — retry
        </button>
      )}
    </div>
  );
}
