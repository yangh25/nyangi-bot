import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { korean, romanization, hanja, pos, category, definitionEn, definitionKo, contextSentence } =
    await req.json();

  if (!korean || !category) {
    return NextResponse.json({ error: "korean and category are required" }, { status: 400 });
  }

  let word = await prisma.word.findFirst({ where: { korean, category: category as Category } });

  const content = {
    romanization: romanization || null,
    hanja: hanja || null,
    pos: pos || null,
    definitionEn: definitionEn || null,
    definitionKo: definitionKo || null,
  };

  if (!word) {
    word = await prisma.word.create({
      data: { korean, category: category as Category, ...content },
    });
  } else {
    word = await prisma.word.update({
      where: { id: word.id },
      data: content,
    });
  }

  const existing = await prisma.userWord.findUnique({
    where: { userId_wordId: { userId: session.user.id, wordId: word.id } },
  });

  if (existing) {
    await prisma.userWord.update({
      where: { id: existing.id },
      data: {
        timesSeen: { increment: 1 },
        lastSeenAt: new Date(),
        ...(contextSentence ? { contextSentence } : {}),
      },
    });
    return NextResponse.json({ ok: true, alreadySeen: true, timesSeen: existing.timesSeen + 1 });
  }

  await prisma.userWord.create({
    data: {
      userId: session.user.id,
      wordId: word.id,
      contextSentence: contextSentence || null,
    },
  });

  return NextResponse.json({ ok: true, alreadySeen: false });
}
