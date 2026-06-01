import Link from "next/link";
import { auth } from "../../../auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const wordCount = session?.user?.id
    ? await prisma.userWord.count({ where: { userId: session.user.id } })
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-1">
        안녕하세요, {session?.user?.name}
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        {wordCount === 0
          ? "You haven't added any words yet."
          : `${wordCount} word${wordCount === 1 ? "" : "s"} in your bank.`}
      </p>
      <Link
        href="/add"
        className="inline-block bg-stone-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700 transition-colors"
      >
        Add a word
      </Link>
    </div>
  );
}
