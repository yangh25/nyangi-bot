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

export interface SearchResult {
  correction: string;
  candidates: KrdictCandidate[];
}

const client = new Anthropic();

async function fetchFromClaude(q: string): Promise<SearchResult> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `For the Korean word or phrase "${q}", return a JSON object with two keys: "correction" and "candidates". correction: if "${q}" is misspelled, the corrected Korean spelling; otherwise an empty string. If "${q}" is gibberish or not a Korean word and no plausible word is close, return an empty candidates array and an empty correction — do NOT invent a word. candidates: an array describing the correctly-spelled word (use the corrected spelling if you set correction) — one entry per distinct word. Group all senses of the same word into one entry; only create separate entries for true homonyms (same spelling, completely different origins, e.g. 배 as stomach vs. 배 as boat). If the word is a 관용어 (idiom) or 속담 (proverb), return a single entry for the whole phrase — do not break it into its individual words. Each candidate must have: word (Korean text), pos (part of speech in Korean e.g. 명사 — empty string for phrases), hanja (Chinese characters if the word is sino-Korean e.g. 幸福 for 행복 — empty string if native Korean or uncertain; do NOT invent hanja based on meaning), definitionKo (all senses in Korean — if multiple, format as "1. first sense 2. second sense"), definitionEn (a short English gloss of one or two words only e.g. "love" not "a feeling of deep affection for another person"), suggestedCategory (one of: PURE_KOREAN, HANJA, FOUR_CHAR_IDIOM, PROVERB, IDIOM). Category guide: PURE_KOREAN=native Korean (순우리말), HANJA=sino-Korean (한자어), FOUR_CHAR_IDIOM=four-character idiom (사자성어), PROVERB=proverb (속담), IDIOM=idiomatic expression (관용어). No markdown, no explanation.`,
      },
    ],
  });

  const raw = message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "{}";
  const json = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  const parsed = JSON.parse(json) as { correction?: string; candidates?: Record<string, string>[] };

  const correction = (parsed.correction ?? "").trim();
  const candidates = (parsed.candidates ?? []).map((item, i) => ({
    targetCode: String(i),
    word: item.word ?? q,
    pos: item.pos ?? "",
    hanja: item.hanja ?? "",
    definitionKo: item.definitionKo ?? "",
    definitionEn: item.definitionEn ?? "",
    suggestedCategory: item.suggestedCategory ?? "",
  }));

  // Ignore a "correction" that just echoes the query.
  return { correction: correction === q ? "" : correction, candidates };
}

// Old cache entries stored a bare candidates array; new ones store { correction, candidates }.
function normalizeCached(results: unknown): SearchResult {
  return Array.isArray(results)
    ? { correction: "", candidates: results as KrdictCandidate[] }
    : (results as SearchResult);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const cached = await prisma.searchCache.findUnique({ where: { query: q } });
  if (cached) {
    return NextResponse.json({ ...normalizeCached(cached.results), fromCache: true });
  }

  let result: SearchResult;
  try {
    result = await fetchFromClaude(q);
  } catch {
    return NextResponse.json({ error: "Failed to fetch definitions" }, { status: 500 });
  }

  // If the corrected spelling is already cached, show that cached version's candidates.
  if (result.correction && result.correction !== q) {
    const correctedCache = await prisma.searchCache.findUnique({ where: { query: result.correction } });
    if (correctedCache) {
      result = { correction: result.correction, candidates: normalizeCached(correctedCache.results).candidates };
    }
  }

  await prisma.searchCache.create({ data: { query: q, results: result as object } });

  // Also cache under the corrected spelling so a later direct search hits the cache.
  if (result.correction && result.correction !== q) {
    const corrected: SearchResult = { correction: "", candidates: result.candidates };
    await prisma.searchCache.upsert({
      where: { query: result.correction },
      create: { query: result.correction, results: corrected as object },
      update: {},
    });
  }

  return NextResponse.json({ ...result, fromCache: false });
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
