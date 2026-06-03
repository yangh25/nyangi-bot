import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";

export const PAGE_SIZE = 30;

// Returns the next slice of the user's words, newest-added first. Paginated by
// a stable (createdAt desc, id desc) cursor — id breaks ties because bulk-add
// can stamp many rows in the same millisecond. `nextCursor` is null at the end.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  const rows = await prisma.userWord.findMany({
    where: { userId: session.user.id },
    include: { word: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1, // one extra row tells us whether more remain
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > PAGE_SIZE;
  const entries = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? entries[entries.length - 1].id : null;

  return NextResponse.json({ entries, nextCursor });
}
