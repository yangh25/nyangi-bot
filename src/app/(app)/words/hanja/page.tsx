import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import HanjaList, { HanjaGroup } from "./HanjaList";

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

  // Most-connected characters first; words within each sorted shortest-first.
  const groups: HanjaGroup[] = [...index.entries()]
    .map(([ch, entries]) => ({
      ch,
      words: entries
        .sort((a, b) => a.word.korean.length - b.word.korean.length)
        .map((e) => ({
          id: e.id,
          korean: e.word.korean,
          hanja: e.word.hanja,
          def: e.word.definitionEn || e.word.definitionKo || "",
        })),
    }))
    .sort((a, b) => b.words.length - a.words.length || a.ch.localeCompare(b.ch));

  const stored = groups.length
    ? await prisma.hanja.findMany({ where: { character: { in: groups.map((g) => g.ch) } } })
    : [];
  const initialMeanings: Record<string, string> = {};
  for (const h of stored) initialMeanings[h.character] = h.meaningKo;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-stone-800">
          Hanja
          <span className="ml-2 text-sm font-normal text-stone-400">
            {groups.length} character{groups.length === 1 ? "" : "s"} · {userWords.length} word
            {userWords.length === 1 ? "" : "s"}
          </span>
        </h1>
        <Link href="/words" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
          Word bank →
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="text-stone-400 text-sm">
          No hanja words yet.{" "}
          <Link href="/add" className="text-stone-800 underline">
            Add one
          </Link>
          .
        </p>
      ) : (
        <HanjaList groups={groups} initialMeanings={initialMeanings} />
      )}
    </div>
  );
}
