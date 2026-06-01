"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import type { KrdictCandidate } from "@/app/api/krdict/route";
import { Category } from "@prisma/client";

interface FormState {
  korean: string;
  romanization: string;
  hanja: string;
  category: Category | "";
  definitionEn: string;
  definitionKo: string;
  contextSentence: string;
}

const EMPTY_FORM: FormState = {
  korean: "",
  romanization: "",
  hanja: "",
  category: "",
  definitionEn: "",
  definitionKo: "",
  contextSentence: "",
};

export default function AddWordPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<KrdictCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState<KrdictCandidate | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ alreadySeen: boolean; timesSeen: number } | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setCandidates([]);
    setSelected(null);
    setForm(EMPTY_FORM);
    setSaveResult(null);

    const res = await fetch(`/api/krdict?q=${encodeURIComponent(query.trim())}`);
    const data = await res.json();
    setSearching(false);

    if (!res.ok || data.error) {
      setSearchError(data.error ?? "Search failed");
      return;
    }
    if (data.candidates.length === 0) {
      setSearchError("No results found");
      return;
    }
    setCandidates(data.candidates);
  }

  function selectCandidate(candidate: KrdictCandidate) {
    setSelected(candidate);
    setForm({
      korean: candidate.word,
      romanization: "",
      hanja: candidate.hanja,
      category: (candidate.suggestedCategory as Category) || "",
      definitionEn: candidate.definitionEn,
      definitionKo: candidate.definitionKo,
      contextSentence: "",
    });
    setSaveResult(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) return;
    setSaving(true);

    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) return;

    setSaveResult({ alreadySeen: data.alreadySeen, timesSeen: data.timesSeen });
    if (!data.alreadySeen) {
      setTimeout(() => router.push("/words"), 800);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-800 mb-6">Add a word</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Korean word…"
          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <button
          type="submit"
          disabled={searching}
          className="bg-stone-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {searchError && <p className="text-red-500 text-sm mb-4">{searchError}</p>}

      {/* Candidates */}
      {candidates.length > 0 && !selected && (
        <div className="space-y-2 mb-6">
          <p className="text-xs text-stone-500 mb-2">{candidates.length} results — pick the right one</p>
          {candidates.map((c) => (
            <button
              key={c.targetCode}
              onClick={() => selectCandidate(c)}
              className="w-full text-left border border-stone-200 rounded-lg px-4 py-3 bg-white hover:border-stone-400 transition-colors"
            >
              <span className="font-medium text-stone-800">{c.word}</span>
              {c.pos && <span className="text-xs text-stone-400 ml-2">{c.pos}</span>}
              {c.definitionKo && (
                <p className="text-sm text-stone-500 mt-0.5 truncate">{c.definitionKo}</p>
              )}
              {c.definitionEn && (
                <p className="text-xs text-stone-400 truncate">{c.definitionEn}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Save result notice */}
      {saveResult?.alreadySeen && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-4">
          You've seen this word before — now seen {saveResult.timesSeen} time{saveResult.timesSeen === 1 ? "" : "s"}.
        </div>
      )}

      {/* Form */}
      {selected && !saveResult?.alreadySeen && (
        <form onSubmit={handleSave} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-stone-800">{form.korean}</span>
            {form.hanja && (
              <span className="text-xl text-stone-400">{form.hanja}</span>
            )}
            <input
              value={form.romanization}
              onChange={(e) => setForm((f) => ({ ...f, romanization: e.target.value }))}
              placeholder="Romanization (optional)"
              className="flex-1 border-b border-stone-200 pb-0.5 text-sm text-stone-500 focus:outline-none focus:border-stone-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: value }))}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    form.category === value
                      ? "bg-stone-800 text-white border-stone-800"
                      : "border-stone-300 text-stone-600 hover:border-stone-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">English definition</label>
            <textarea
              value={form.definitionEn}
              onChange={(e) => setForm((f) => ({ ...f, definitionEn: e.target.value }))}
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Korean definition</label>
            <textarea
              value={form.definitionKo}
              onChange={(e) => setForm((f) => ({ ...f, definitionKo: e.target.value }))}
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Context sentence (optional)</label>
            <textarea
              value={form.contextSentence}
              onChange={(e) => setForm((f) => ({ ...f, contextSentence: e.target.value }))}
              placeholder="Sentence where you saw this word…"
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !form.category}
              className="bg-stone-800 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save word"}
            </button>
            <button
              type="button"
              onClick={() => { setSelected(null); setCandidates([]); }}
              className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
            >
              Back to results
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
