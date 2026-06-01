import { Category } from "@prisma/client";

export const CATEGORY_LABELS: Record<Category, string> = {
  PURE_KOREAN: "순우리말",
  HANJA: "한자",
  FOUR_CHAR_IDIOM: "사자성어",
  PROVERB: "속담",
  IDIOM: "관용어",
};

export const CATEGORIES = Object.entries(CATEGORY_LABELS) as [Category, string][];
