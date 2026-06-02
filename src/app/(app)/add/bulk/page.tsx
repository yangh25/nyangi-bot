"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { KrdictCandidate } from "@/app/api/krdict/route";
import { Category } from "@prisma/client";

function splitSenses(def: string): string[] {
  return def.split(/\s+(?=\d+\.\s)/).map((s) => s.trim()).filter(Boolean);
}

interface Row {
  query: string;
  correction: string;
  candidates: KrdictCandidate[];
  selectedIdx: number | null; // index into candidates; pre-set to 0 when only one
  category: Category | "";
  saved: boolean;
  saveError: string;
  error: boolean; // search failed (transient/truncation) — distinct from "no match"
}

type SearchOutcome = { candidates: KrdictCandidate[]; correction: string; error: boolean };

async function fetchCandidates(query: string): Promise<SearchOutcome> {
  try {
    const res = await fetch(`/api/krdict?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (res.ok && !data.error) {
      return { candidates: data.candidates ?? [], correction: data.correction ?? "", error: false };
    }
    return { candidates: [], correction: "", error: true };
  } catch {
    return { candidates: [], correction: "", error: true };
  }
}

function rowFrom(query: string, res: SearchOutcome): Row {
  return {
    query,
    correction: res.correction,
    candidates: res.candidates,
    selectedIdx: res.candidates.length === 1 ? 0 : null,
    category: res.candidates.length === 1 ? makeCategory(res.candidates[0]) : "",
    saved: false,
    saveError: "",
    error: res.error,
  };
}

const SEARCH_CONCURRENCY = 4;

function makeCategory(c: KrdictCandidate | undefined): Category | "" {
  return (c?.suggestedCategory as Category) || "";
}

export default function BulkAddPage() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const searching = progress !== null && progress.done < progress.total;

  async function handleSearch() {
    const words = Array.from(
      new Set(text.split(/[\n,]/).map((w) => w.trim()).filter(Boolean))
    );
    if (words.length === 0) return;

    setRows([]);
    setProgress({ done: 0, total: words.length });

    // Search in parallel with a bounded worker pool. Results are keyed by
    // index so display order matches input order even as calls finish
    // out of order; the progress counter ticks as each one resolves.
    const results: (Row | undefined)[] = new Array(words.length);
    let done = 0;
    let next = 0;

    async function worker() {
      while (next < words.length) {
        const i = next++;
        results[i] = rowFrom(words[i], await fetchCandidates(words[i]));
        done++;
        setProgress({ done, total: words.length });
        setRows(results.filter((r): r is Row => r !== undefined));
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(SEARCH_CONCURRENCY, words.length) }, worker),
    );
  }

  async function retryRow(query: string) {
    const res = await fetchCandidates(query);
    setRows((rs) => rs.map((r) => (r.query === query ? rowFrom(query, res) : r)));
  }

  function selectCandidate(query: string, idx: number) {
    setRows((rs) =>
      rs.map((r) =>
        r.query === query
          ? { ...r, selectedIdx: idx, category: makeCategory(r.candidates[idx]) }
          : r
      )
    );
  }

  function clearSelection(query: string) {
    setRows((rs) =>
      rs.map((r) => (r.query === query ? { ...r, selectedIdx: null, category: "" } : r))
    );
  }

  function setCategory(query: string, category: Category) {
    setRows((rs) => rs.map((r) => (r.query === query ? { ...r, category } : r)));
  }

  async function saveRow(row: Row): Promise<boolean> {
    if (row.selectedIdx === null || !row.category) return false;
    const c = row.candidates[row.selectedIdx];
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          korean: c.word,
          hanja: c.hanja,
          pos: c.pos,
          category: row.category,
          definitionEn: c.definitionEn,
          definitionKo: splitSenses(c.definitionKo).join("\n"),
        }),
      });
      if (!res.ok) {
        setRows((rs) =>
          rs.map((r) => (r.query === row.query ? { ...r, saveError: "Save failed" } : r))
        );
        return false;
      }
    } catch {
      setRows((rs) =>
        rs.map((r) => (r.query === row.query ? { ...r, saveError: "Save failed" } : r))
      );
      return false;
    }
    setRows((rs) =>
      rs.map((r) => (r.query === row.query ? { ...r, saved: true, saveError: "" } : r))
    );
    return true;
  }

  async function saveAllReady() {
    for (const row of rows) {
      if (!row.saved && row.selectedIdx !== null && row.category) {
        await saveRow(row);
      }
    }
  }

  const needsReview = rows.filter((r) => !r.saved && r.candidates.length > 1 && r.selectedIdx === null);
  const ready = rows.filter((r) => !r.saved && r.selectedIdx !== null);
  const failed = rows.filter((r) => r.error && !r.saved);
  const notFound = rows.filter((r) => !r.error && r.candidates.length === 0);
  const added = rows.filter((r) => r.saved);

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-800 mb-6">Bulk add words</h1>

      <div className="mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="One word per line (or comma-separated)…"
          rows={6}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-y"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !text.trim()}
          className="mt-2 bg-stone-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          {searching ? `Searching ${progress!.done}/${progress!.total}…` : "Search all"}
        </button>
      </div>

      {/* Ready to add — single-definition words are pre-filled here */}
      {ready.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700">
              Ready to add <span className="text-stone-400 font-normal">({ready.length})</span>
            </h2>
            <button
              onClick={saveAllReady}
              className="bg-stone-800 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-stone-700 transition-colors"
            >
              Save all ready
            </button>
          </div>
          <div className="space-y-2">
            {ready.map((row) => {
              const c = row.candidates[row.selectedIdx!];
              return (
                <div key={row.query} className="border border-stone-200 rounded-lg px-4 py-3 bg-white">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-stone-800">{c.word}</span>
                    {c.hanja && <span className="text-stone-400 text-sm">{c.hanja}</span>}
                    {c.pos && <span className="text-xs text-stone-400">{c.pos}</span>}
                  </div>
                  {c.definitionKo && (
                    <div className="text-sm text-stone-500 mt-0.5">
                      {splitSenses(c.definitionKo).map((s, i) => (
                        <p key={i}>{s}</p>
                      ))}
                    </div>
                  )}
                  {c.definitionEn && <p className="text-xs text-stone-400">{c.definitionEn}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {CATEGORIES.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCategory(row.query, value)}
                        className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                          row.category === value
                            ? "bg-stone-800 text-white border-stone-800"
                            : "border-stone-300 text-stone-600 hover:border-stone-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => saveRow(row)}
                      disabled={!row.category}
                      className="text-xs font-medium text-stone-700 hover:text-stone-900 disabled:opacity-40 transition-colors"
                    >
                      Save
                    </button>
                    {row.candidates.length > 1 && (
                      <button
                        onClick={() => clearSelection(row.query)}
                        className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        Change definition
                      </button>
                    )}
                    {row.saveError && <span className="text-xs text-red-500">{row.saveError}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Needs review — multiple homonyms, pick one */}
      {needsReview.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">
            Needs review <span className="text-stone-400 font-normal">({needsReview.length})</span>
          </h2>
          <div className="space-y-3">
            {needsReview.map((row) => (
              <div key={row.query} className="border border-stone-200 rounded-lg px-4 py-3 bg-white">
                <p className="text-xs text-stone-500 mb-2">
                  <span className="font-medium text-stone-700">{row.query}</span>
                  {row.correction && row.correction !== row.query && (
                    <span className="text-amber-700"> → {row.correction}</span>
                  )}{" "}
                  has {row.candidates.length} meanings — pick one
                </p>
                <div className="space-y-1.5">
                  {row.candidates.map((c, idx) => (
                    <button
                      key={c.targetCode}
                      onClick={() => selectCandidate(row.query, idx)}
                      className="w-full text-left border border-stone-200 rounded-lg px-3 py-2 hover:border-stone-400 transition-colors"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-stone-800">{c.word}</span>
                        {c.hanja && <span className="text-stone-400 text-sm">{c.hanja}</span>}
                        {c.pos && <span className="text-xs text-stone-400">{c.pos}</span>}
                      </div>
                      {c.definitionKo && (
                        <div className="text-sm text-stone-500">
                          {splitSenses(c.definitionKo).map((s, i) => (
                            <p key={i}>{s}</p>
                          ))}
                        </div>
                      )}
                      {c.definitionEn && <p className="text-xs text-stone-400">{c.definitionEn}</p>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Added */}
      {added.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">
            Added <span className="text-stone-400 font-normal">({added.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {added.map((row) => (
              <span
                key={row.query}
                className="bg-green-50 border border-green-200 text-green-800 rounded-full px-3 py-1 text-xs"
              >
                {row.candidates[row.selectedIdx!].word}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Failed — transient error or truncated result, retryable */}
      {failed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">
            Failed <span className="text-stone-400 font-normal">({failed.length})</span>
          </h2>
          <div className="space-y-2">
            {failed.map((row) => (
              <div
                key={row.query}
                className="flex items-center justify-between border border-amber-200 bg-amber-50 rounded-lg px-4 py-2"
              >
                <span className="text-sm text-amber-800">{row.query} — search failed</span>
                <button
                  onClick={() => retryRow(row.query)}
                  className="text-xs font-medium text-amber-800 hover:text-amber-950 transition-colors"
                >
                  Retry
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Not found */}
      {notFound.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">
            Not found <span className="text-stone-400 font-normal">({notFound.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {notFound.map((row) => (
              <span
                key={row.query}
                className="bg-stone-100 border border-stone-200 text-stone-500 rounded-full px-3 py-1 text-xs"
              >
                {row.query}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
