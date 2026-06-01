import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userWords = await prisma.userWord.findMany({
    where: { userId: session.user.id },
    include: { word: true },
  });

  const now = Date.now();
  const scored = userWords
    .map((uw) => ({
      ...uw,
      score: (now - new Date(uw.lastSeenAt).getTime()) / 86400000 / (uw.timesSeen + 1),
    }))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ words: scored });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userWordId, gotIt } = await req.json();

  await prisma.userWord.update({
    where: { id: userWordId, userId: session.user.id },
    data: {
      lastSeenAt: new Date(),
      ...(gotIt ? { timesSeen: { increment: 1 } } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
