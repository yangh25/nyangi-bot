import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import WordBank from "./WordBank";
import Link from "next/link";

export default async function WordsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userWords = await prisma.userWord.findMany({
    where: { userId: session.user.id },
    include: { word: true },
    orderBy: { lastSeenAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-stone-800">
          Word bank
          <span className="ml-2 text-sm font-normal text-stone-400">{userWords.length} words</span>
        </h1>
        <Link
          href="/add"
          className="bg-stone-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          Add word
        </Link>
      </div>

      {userWords.length === 0 ? (
        <p className="text-stone-400 text-sm">
          No words yet.{" "}
          <Link href="/add" className="text-stone-800 underline">
            Add your first word.
          </Link>
        </p>
      ) : (
        <WordBank words={userWords} />
      )}
    </div>
  );
}
