import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "../../../../auth";

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `List up to 5 definitions or senses for the Korean word "${q}". Return ONLY a JSON array. Each item must have: word (Korean text), pos (part of speech in Korean, e.g. 명사), hanja (the Chinese characters the word is directly written from if it is sino-Korean, e.g. 幸福 for 행복 — empty string if the word is native Korean (순우리말) or the etymology is uncertain; do NOT invent hanja based on meaning), definitionKo (Korean definition), definitionEn (English definition), suggestedCategory (one of: PURE_KOREAN, HANJA, FOUR_CHAR_IDIOM, PROVERB, IDIOM). Category guide: PURE_KOREAN=native Korean (순우리말), HANJA=sino-Korean (한자어), FOUR_CHAR_IDIOM=four-character idiom (사자성어), PROVERB=proverb (속담), IDIOM=idiomatic expression (관용어). No markdown, no explanation.`,
      },
    ],
  });

  const raw = message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "[]";
  const json = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();

  let candidates: KrdictCandidate[];
  try {
    const parsed = JSON.parse(json) as Record<string, string>[];
    candidates = parsed.map((item, i) => ({
      targetCode: String(i),
      word: item.word ?? q,
      pos: item.pos ?? "",
      hanja: item.hanja ?? "",
      definitionKo: item.definitionKo ?? "",
      definitionEn: item.definitionEn ?? "",
      suggestedCategory: item.suggestedCategory ?? "",
    }));
  } catch {
    return NextResponse.json({ error: "Failed to parse definitions" }, { status: 500 });
  }

  return NextResponse.json({ candidates });
}
