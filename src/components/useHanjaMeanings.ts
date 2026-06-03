import { useEffect, useState } from "react";

const isHanja = (ch: string) => /\p{Script=Han}/u.test(ch);

// Returns Korean 훈음 meanings for every distinct hanja character across the
// given strings, backfilling any not yet stored via /api/hanja. Reacts to a
// growing set of strings (e.g. as the timeline loads more), fetching only the
// newly-seen characters each time.
export function useHanjaMeanings(hanjaStrings: (string | null | undefined)[]) {
  const [meanings, setMeanings] = useState<Record<string, string>>({});

  // Stable key: the sorted set of distinct hanja characters, so the effect
  // only re-runs when the actual character set changes (not every render).
  const key = [...new Set(hanjaStrings.flatMap((h) => (h ? [...h] : [])).filter(isHanja))]
    .sort()
    .join("|");

  useEffect(() => {
    const missing = key ? key.split("|").filter((ch) => !meanings[ch]) : [];
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key, meanings]);

  return meanings;
}
