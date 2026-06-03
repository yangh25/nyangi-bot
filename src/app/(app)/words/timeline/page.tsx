import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/categories";
import Link from "next/link";

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userWords = await prisma.userWord.findMany({
    where: { userId: session.user.id },
    include: { word: true },
    orderBy: { createdAt: "desc" },
  });

  // Group by the calendar day a word was added (entries are already newest-first).
  const groups: { key: string; label: string; entries: typeof userWords }[] = [];
  for (const entry of userWords) {
    const key = entry.createdAt.toDateString();
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = {
        key,
        label: entry.createdAt.toLocaleDateString("en-US", {
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-stone-800">
          Timeline
          <span className="ml-2 text-sm font-normal text-stone-400">by date added</span>
        </h1>
        <Link href="/words" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
          Word bank →
        </Link>
      </div>

      {groups.length === 0 && <p className="text-stone-400 text-sm">No words yet.</p>}

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
                      {word.hanja && <span className="text-sm text-stone-400">{word.hanja}</span>}
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
    </div>
  );
}
