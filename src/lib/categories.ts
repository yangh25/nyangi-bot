import { Category } from "@prisma/client";

export const CATEGORY_LABELS: Record<Category, string> = {
  PURE_KOREAN: "순우리말",
  HANJA: "한자",
  FOUR_CHAR_IDIOM: "사자성어",
  PROVERB: "속담",
  IDIOM: "관용어",
};

export const CATEGORIES = Object.entries(CATEGORY_LABELS) as [Category, string][];

export const CATEGORY_COLORS: Record<Category, string> = {
  PURE_KOREAN: "bg-emerald-50 text-emerald-700",
  HANJA: "bg-blue-50 text-blue-700",
  FOUR_CHAR_IDIOM: "bg-purple-50 text-purple-700",
  PROVERB: "bg-amber-50 text-amber-700",
  IDIOM: "bg-rose-50 text-rose-700",
};
