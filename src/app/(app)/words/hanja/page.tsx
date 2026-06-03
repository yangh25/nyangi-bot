import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

// Only real CJK (Han) characters count as hanja; the hanja field occasionally
// contains stray hangul (e.g. 하, 다) from bad model output.
const isHanja = (ch: string) => /\p{Script=Han}/u.test(ch);

export default async function HanjaPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userWords = await prisma.userWord.findMany({
    where: { userId: session.user.id, word: { category: "HANJA" } },
    include: { word: true },
    orderBy: { lastSeenAt: "desc" },
  });

  // Map each hanja character to the words that contain it.
  const index = new Map<string, typeof userWords>();
  for (const entry of userWords) {
    if (!entry.word.hanja) continue;
    for (const ch of new Set(entry.word.hanja)) {
      if (!isHanja(ch)) continue;
      const list = index.get(ch) ?? [];
      list.push(entry);
      index.set(ch, list);
    }
  }

  // Most-connected characters first, then by how many words share them.
  const chars = [...index.entries()]
    .map(([ch, entries]) => ({
      ch,
      entries: entries.sort((a, b) => a.word.korean.length - b.word.korean.length),
    }))
    .sort((a, b) => b.entries.length - a.entries.length || a.ch.localeCompare(b.ch));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-stone-800">
          Hanja
          <span className="ml-2 text-sm font-normal text-stone-400">
            {chars.length} character{chars.length === 1 ? "" : "s"} · {userWords.length} word
            {userWords.length === 1 ? "" : "s"}
          </span>
        </h1>
        <Link href="/words" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
          Word bank →
        </Link>
      </div>

      {chars.length === 0 && (
        <p className="text-stone-400 text-sm">
          No hanja words yet.{" "}
          <Link href="/add" className="text-stone-800 underline">
            Add one
          </Link>
          .
        </p>
      )}

      <div className="space-y-3">
        {chars.map(({ ch, entries }) => (
          <div key={ch} className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-blue-700">{ch}</span>
              <span className="text-xs text-stone-400">
                {entries.length} word{entries.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-1">
              {entries.map((entry) => {
                const { word } = entry;
                return (
                  <div key={entry.id} className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium text-stone-800 whitespace-nowrap">
                      {word.korean}
                      {word.hanja ? <span className="text-stone-400"> ({word.hanja})</span> : ""}
                    </span>
                    <span className="text-stone-500">
                      {word.definitionEn || word.definitionKo}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
