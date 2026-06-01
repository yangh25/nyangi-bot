"use client";

import { useEffect, useState, useCallback } from "react";
import { Category } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/categories";

interface ReviewWord {
  id: string;
  timesSeen: number;
  lastSeenAt: string;
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

const CATEGORY_COLORS: Record<Category, string> = {
  PURE_KOREAN: "bg-emerald-50 text-emerald-700",
  HANJA: "bg-blue-50 text-blue-700",
  FOUR_CHAR_IDIOM: "bg-purple-50 text-purple-700",
  PROVERB: "bg-amber-50 text-amber-700",
  IDIOM: "bg-rose-50 text-rose-700",
};

export default function ReviewPage() {
  const [queue, setQueue] = useState<ReviewWord[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/review");
    const data = await res.json();
    setQueue(data.words ?? []);
    setIndex(0);
    setRevealed(false);
    setLoading(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function handleAnswer(gotIt: boolean) {
    const current = queue[index];
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userWordId: current.id, gotIt }),
    });

    setSessionCount((n) => n + 1);
    setRevealed(false);

    if (index + 1 >= queue.length) {
      await loadQueue();
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (loading) {
    return <div className="text-stone-400 text-sm">Loading…</div>;
  }

  if (queue.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-bold text-stone-800 mb-2">Review</h1>
        <p className="text-stone-400 text-sm">No words to review yet. Add some words first.</p>
      </div>
    );
  }

  const current = queue[index];
  const { word } = current;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-stone-800">Review</h1>
        {sessionCount > 0 && (
          <span className="text-sm text-stone-400">{sessionCount} reviewed this session</span>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-8">
        {/* Word */}
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-4xl font-bold text-stone-800">{word.korean}</span>
          {word.hanja && <span className="text-2xl text-stone-400">{word.hanja}</span>}
        </div>
        {word.romanization && (
          <p className="text-sm text-stone-400 mb-4">{word.romanization}</p>
        )}

        <div className="flex items-center gap-2 mb-6">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[word.category]}`}>
            {CATEGORY_LABELS[word.category]}
          </span>
          {word.pos && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
              {word.pos}
            </span>
          )}
          <span className="text-xs text-stone-400 ml-auto">
            Seen {current.timesSeen} time{current.timesSeen === 1 ? "" : "s"}
          </span>
        </div>

        {/* Reveal */}
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors text-sm"
          >
            Reveal definition
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-stone-50 rounded-xl space-y-1">
              {word.definitionKo && (
                <p className="text-sm text-stone-700 whitespace-pre-line">{word.definitionKo}</p>
              )}
              {word.definitionEn && (
                <p className="text-sm text-stone-500">{word.definitionEn}</p>
              )}
              {current.contextSentence && (
                <p className="text-sm text-stone-400 italic border-l-2 border-stone-200 pl-3 mt-2">
                  {current.contextSentence}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Missed it
              </button>
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress hint */}
      <p className="text-center text-xs text-stone-400 mt-4">
        {index + 1} of {queue.length} in this round
      </p>
    </div>
  );
}
