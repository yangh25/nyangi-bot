import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";

export interface KrdictCandidate {
  targetCode: string;
  word: string;
  pos: string;
  hanja: string;
  definitionKo: string;
  definitionEn: string;
  suggestedCategory: string;
}

const client = new Anthropic();

async function fetchFromClaude(q: string): Promise<KrdictCandidate[]> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `For the Korean word "${q}", return a JSON array — one entry per distinct word. Group all senses of the same word into one entry; only create separate entries for true homonyms (same spelling, completely different origins, e.g. 배 as stomach vs. 배 as boat). Each item must have: word (Korean text), pos (part of speech in Korean e.g. 명사 — empty string for phrases), hanja (Chinese characters if the word is sino-Korean e.g. 幸福 for 행복 — empty string if native Korean or uncertain; do NOT invent hanja based on meaning), definitionKo (all senses in Korean — if multiple, format as "1. first sense 2. second sense"), definitionEn (a short English gloss of one or two words only e.g. "love" not "a feeling of deep affection for another person"), suggestedCategory (one of: PURE_KOREAN, HANJA, FOUR_CHAR_IDIOM, PROVERB, IDIOM). Category guide: PURE_KOREAN=native Korean (순우리말), HANJA=sino-Korean (한자어), FOUR_CHAR_IDIOM=four-character idiom (사자성어), PROVERB=proverb (속담), IDIOM=idiomatic expression (관용어). No markdown, no explanation.`,
      },
    ],
  });

  const raw = message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "[]";
  const json = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  const parsed = JSON.parse(json) as Record<string, string>[];

  return parsed.map((item, i) => ({
    targetCode: String(i),
    word: item.word ?? q,
    pos: item.pos ?? "",
    hanja: item.hanja ?? "",
    definitionKo: item.definitionKo ?? "",
    definitionEn: item.definitionEn ?? "",
    suggestedCategory: item.suggestedCategory ?? "",
  }));
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const cached = await prisma.searchCache.findUnique({ where: { query: q } });
  if (cached) {
    return NextResponse.json({ candidates: cached.results, fromCache: true });
  }

  let candidates: KrdictCandidate[];
  try {
    candidates = await fetchFromClaude(q);
  } catch {
    return NextResponse.json({ error: "Failed to fetch definitions" }, { status: 500 });
  }

  await prisma.searchCache.create({ data: { query: q, results: candidates as object[] } });

  return NextResponse.json({ candidates, fromCache: false });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  await prisma.searchCache.deleteMany({ where: { query: q } });

  return NextResponse.json({ ok: true });
}
