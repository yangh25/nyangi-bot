import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Timeline from "./Timeline";
import { PAGE_SIZE } from "@/app/api/timeline/route";

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // First slice rendered server-side for instant paint; the rest is loaded on
  // scroll via /api/timeline, paginated by the same (createdAt desc, id desc)
  // cursor. The extra row tells us whether there's a next page.
  const rows = await prisma.userWord.findMany({
    where: { userId: session.user.id },
    include: { word: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const entries = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const initialCursor = hasMore ? entries[entries.length - 1].id : null;

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

      {entries.length === 0 ? (
        <p className="text-stone-400 text-sm">No words yet.</p>
      ) : (
        <Timeline initialEntries={entries} initialCursor={initialCursor} />
      )}
    </div>
  );
}
