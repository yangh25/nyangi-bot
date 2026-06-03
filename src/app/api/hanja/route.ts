import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "../../../../auth";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

const isHanja = (ch: string) => /\p{Script=Han}/u.test(ch);

interface HanjaMeaning {
  character: string;
  meaningKo: string;
  meaningEn: string;
}

// Each gloss is a short rote lookup, so a batch of this many fits comfortably
// within max_tokens. Bigger batches truncate the JSON and lose the whole call.
const BATCH_SIZE = 40;

async function fetchMeanings(chars: string[]): Promise<HanjaMeaning[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `다음 한자 각각에 대해 "character", "meaningKo", "meaningEn" 키를 가진 객체들의 JSON 배열을 반환하세요. character: 해당 한자. meaningKo: 표준적인 훈음(뜻과 음), 예: 變 → "변할 변", 學 → "배울 학", 江 → "강 강". meaningEn: 간단한 영어 뜻 한두 단어, 예: "change", "learn", "river". 마크다운이나 설명 없이 JSON 배열만 반환하세요. 한자: ${chars.join(" ")}`,
      },
    ],
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error("TRUNCATED");
  }

  const raw = message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "[]";
  const json = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  const parsed = JSON.parse(json) as Partial<HanjaMeaning>[];

  return parsed
    .filter((m) => m.character && isHanja(m.character) && m.meaningKo)
    .map((m) => ({
      character: m.character!,
      meaningKo: m.meaningKo!.trim(),
      meaningEn: (m.meaningEn ?? "").trim(),
    }));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { characters } = (await req.json()) as { characters?: string[] };
  const chars = [...new Set((characters ?? []).filter(isHanja))];
  if (chars.length === 0) return NextResponse.json({ meanings: {} });

  const existing = await prisma.hanja.findMany({ where: { character: { in: chars } } });
  const have = new Set(existing.map((e) => e.character));
  const missing = chars.filter((c) => !have.has(c));

  const fetched: HanjaMeaning[] = [];
  if (missing.length > 0) {
    const batches: string[][] = [];
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      batches.push(missing.slice(i, i + BATCH_SIZE));
    }
    // Run batches in parallel; a failed batch just leaves those characters to
    // be retried on the next visit, without losing the batches that succeeded.
    const settled = await Promise.allSettled(batches.map(fetchMeanings));
    for (const r of settled) {
      if (r.status === "fulfilled") fetched.push(...r.value);
    }
    if (fetched.length > 0) {
      await prisma.hanja.createMany({ data: fetched, skipDuplicates: true });
    }
  }

  const meanings: Record<string, string> = {};
  for (const e of [...existing, ...fetched]) meanings[e.character] = e.meaningKo;

  return NextResponse.json({ meanings });
}
