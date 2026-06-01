"use client";

import { useMemo, useState } from "react";
import { Category } from "@prisma/client";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

interface WordEntry {
  id: string;
  timesSeen: number;
  lastSeenAt: Date;
  contextSentence: string | null;
  word: {
    korean: string;
    hanja: string | null;
    pos: string | null;
    romanization: string | null;
    category: Category;
    definitionEn: string | null;
    definitionKo: string | null;
  };
}

function timeAgo(date: Date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

const CATEGORY_COLORS: Record<Category, string> = {
  PURE_KOREAN: "bg-emerald-50 text-emerald-700",
  HANJA: "bg-blue-50 text-blue-700",
  FOUR_CHAR_IDIOM: "bg-purple-50 text-purple-700",
  PROVERB: "bg-amber-50 text-amber-700",
  IDIOM: "bg-rose-50 text-rose-700",
};

export default function WordBank({ words }: { words: WordEntry[] }) {
  const [filter, setFilter] = useState<Category | "ALL">("ALL");

  const filtered = filter === "ALL" ? words : words.filter((w) => w.word.category === filter);

  // Map each hanja character to the HANJA words that contain it.
  const hanjaIndex = useMemo(() => {
    const map = new Map<string, WordEntry[]>();
    for (const entry of words) {
      if (entry.word.category !== "HANJA" || !entry.word.hanja) continue;
      for (const ch of new Set(entry.word.hanja)) {
        const list = map.get(ch) ?? [];
        list.push(entry);
        map.set(ch, list);
      }
    }
    return map;
  }, [words]);

  function relatedByChar(entry: WordEntry) {
    if (entry.word.category !== "HANJA" || !entry.word.hanja) return [];
    return [...new Set(entry.word.hanja)]
      .map((ch) => ({
        ch,
        others: (hanjaIndex.get(ch) ?? []).filter((e) => e.id !== entry.id),
      }))
      .filter(({ others }) => others.length > 0);
  }

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            filter === "ALL"
              ? "bg-stone-800 text-white border-stone-800"
              : "border-stone-300 text-stone-600 hover:border-stone-500"
          }`}
        >
          All ({words.length})
        </button>
        {CATEGORIES.map(([value, label]) => {
          const count = words.filter((w) => w.word.category === value).length;
          if (count === 0) return null;
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                filter === value
                  ? "bg-stone-800 text-white border-stone-800"
                  : "border-stone-300 text-stone-600 hover:border-stone-500"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-stone-400 text-sm">No words in this category yet.</p>
      )}

      <div className="space-y-3">
        {filtered.map((entry) => {
          const { word } = entry;
          const related = relatedByChar(entry);
          return (
            <div key={entry.id} className="bg-white border border-stone-200 rounded-xl p-5">
              {/* Top row */}
              <div className="flex items-baseline gap-2 flex-wrap mb-2">
                <span className="text-2xl font-bold text-stone-800">{word.korean}</span>
                {word.hanja && (
                  <span className="text-lg text-stone-400">{word.hanja}</span>
                )}
                {word.romanization && (
                  <span className="text-sm text-stone-400">{word.romanization}</span>
                )}
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[word.category]}`}>
                  {CATEGORY_LABELS[word.category]}
                </span>
                {word.pos && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                    {word.pos}
                  </span>
                )}
              </div>

              {/* Definitions */}
              {word.definitionKo && (
                <p className="text-sm text-stone-700 mb-0.5 whitespace-pre-line">{word.definitionKo}</p>
              )}
              {word.definitionEn && (
                <p className="text-sm text-stone-500">{word.definitionEn}</p>
              )}

              {/* Context sentence */}
              {entry.contextSentence && (
                <p className="text-sm text-stone-400 italic mt-2 border-l-2 border-stone-200 pl-3">
                  {entry.contextSentence}
                </p>
              )}

              {/* Shared hanja */}
              {related.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-1">
                  {related.map(({ ch, others }) => (
                    <div key={ch} className="flex items-baseline gap-2 text-sm">
                      <span className="text-base font-bold text-blue-700">{ch}</span>
                      <span className="text-stone-500">
                        {others.map((o, i) => (
                          <span key={o.id} className="group/word relative">
                            <span className="underline decoration-dotted underline-offset-2 cursor-help">
                              {o.word.korean}{o.word.hanja ? ` (${o.word.hanja})` : ""}
                            </span>
                            {o.word.definitionKo && (
                              <span className="hidden group-hover/word:block absolute left-0 top-full mt-1 z-10 w-max max-w-xs bg-white border border-stone-200 text-stone-700 text-xs rounded-lg px-3 py-2 whitespace-pre-line shadow-md">
                                {o.word.definitionKo}
                              </span>
                            )}
                            {i < others.length - 1 ? "、 " : ""}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100">
                <span className="text-xs text-stone-400">
                  Seen {entry.timesSeen} time{entry.timesSeen === 1 ? "" : "s"}
                </span>
                <span className="text-xs text-stone-300">·</span>
                <span className="text-xs text-stone-400">
                  Last seen {timeAgo(entry.lastSeenAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
