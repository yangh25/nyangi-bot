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
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `한국어 단어나 구 "${q}"에 대해 "correction"과 "candidates" 두 개의 키를 가진 JSON 객체를 반환하세요. correction: "${q}"의 철자가 틀렸으면 올바른 한국어 철자를, 맞으면 빈 문자열을 넣으세요. "${q}"가 의미 없는 문자열이거나 한국어 단어가 아니고 가까운 단어도 없으면 candidates를 빈 배열로, correction을 빈 문자열로 반환하고 단어를 지어내지 마세요. candidates: 올바르게 표기된 단어를 기술하는 배열로(correction을 설정했다면 교정된 철자를 사용), 서로 다른 단어마다 항목 하나씩 만드세요. 표준국어대사전을 기준으로 하세요. "${q}"에 해당하는 모든 표제어를 빠짐없이 찾아 표제어마다 candidate 하나를 만드세요. 표준국어대사전에서 서로 다른 표제어로 등재된 동음이의어(철자는 같지만 어원이나 품사가 다른 말 — 예: 배(신체)·배(과일)·배(타는 것), 또는 달다(형용사, 맛이 달다)·달다(동사, 물건을 매달다)·달다(동사, 저울로 무게를 재다)·달다(동사, 쇠가 뜨겁게 되다)·달다(동사, 무엇을 요구하다))는 각각 별도의 candidate로 분리하세요. 반대로 하나의 표제어가 가진 여러 뜻풀이(다의어)는 하나의 candidate로 묶고 모든 뜻풀이를 definitionKo에 나열하세요. "${q}"가 관용어나 속담이면 구 전체를 하나의 candidate로 반환하고 낱말로 쪼개지 마세요. 각 candidate는 다음 필드를 가져야 합니다: word (한국어 표기), pos (품사를 한국어로, 예: 명사 — 구이면 빈 문자열), hanja (한자어이면 해당 한자, 예: 행복 → 幸福 — 순우리말이거나 불확실하면 빈 문자열; 뜻을 보고 한자를 지어내지 마세요), definitionKo (모든 뜻풀이를 한국어로, 여러 개면 "1. 첫째 뜻 2. 둘째 뜻" 형식으로), definitionEn (한두 단어의 짧은 영어 풀이, 예: "a feeling of deep affection for another person"이 아니라 "love"), suggestedCategory (다음 중 하나: PURE_KOREAN, HANJA, FOUR_CHAR_IDIOM, PROVERB, IDIOM). 분류 기준: PURE_KOREAN=순우리말, HANJA=한자어, FOUR_CHAR_IDIOM=사자성어, PROVERB=속담, IDIOM=관용어. 마크다운이나 설명 없이 JSON만 반환하세요.`,
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
