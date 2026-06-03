"use client";

import { useEffect, useState } from "react";
import { useInfiniteScroll } from "@/components/useInfiniteScroll";

const PAGE_SIZE = 20;

interface HanjaWord {
  id: string;
  korean: string;
  hanja: string | null;
  def: string;
}

export interface HanjaGroup {
  ch: string;
  words: HanjaWord[];
}

export default function HanjaList({
  groups,
  initialMeanings,
}: {
  groups: HanjaGroup[];
  initialMeanings: Record<string, string>;
}) {
  const [meanings, setMeanings] = useState(initialMeanings);
  const [loading, setLoading] = useState(() => groups.some((g) => !initialMeanings[g.ch]));
  const { count, sentinelRef } = useInfiniteScroll(groups.length, PAGE_SIZE);

  const visible = groups.slice(0, count);

  // Backfill any characters whose meaning isn't stored yet, then merge in the
  // results. Runs once on mount; the server page never blocks on this.
  useEffect(() => {
    const missing = groups.map((g) => g.ch).filter((ch) => !initialMeanings[ch]);
    if (missing.length === 0) return;
    let cancelled = false;
    fetch("/api/hanja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characters: missing }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.meanings) setMeanings((m) => ({ ...m, ...data.meanings }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groups, initialMeanings]);

  return (
    <div className="space-y-3">
      {loading && (
        <p className="text-xs text-stone-400">Fetching hanja meanings… they&apos;ll appear shortly.</p>
      )}
      {visible.map(({ ch, words }) => (
        <div key={ch} className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-blue-700">{ch}</span>
            {meanings[ch] && <span className="text-sm text-stone-500">{meanings[ch]}</span>}
            <span className="ml-auto text-xs text-stone-400">
              {words.length} word{words.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="space-y-1">
            {words.map((word) => (
              <div key={word.id} className="flex items-baseline gap-2 text-sm">
                <span className="font-medium text-stone-800 whitespace-nowrap">
                  {word.korean}
                  {word.hanja ? <span className="text-stone-400"> ({word.hanja})</span> : ""}
                </span>
                <span className="text-stone-500">{word.def}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div ref={sentinelRef} aria-hidden />
    </div>
  );
}
