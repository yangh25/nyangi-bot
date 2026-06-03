// The hanja field occasionally contains stray hangul (e.g. 하, 다) from bad
// model output; only real CJK (Han) characters get a meaning tooltip.
const isHanja = (ch: string) => /\p{Script=Han}/u.test(ch);

// Renders a hanja string character-by-character. Each real hanja with a known
// Korean 훈음 meaning gets a hover bubble (e.g. 變 → "변할 변").
export default function HanjaText({
  hanja,
  meanings,
  className,
}: {
  hanja: string;
  meanings: Record<string, string>;
  className?: string;
}) {
  return (
    <span className={className}>
      {[...hanja].map((ch, i) => {
        const meaning = isHanja(ch) ? meanings[ch] : undefined;
        if (!meaning) return <span key={i}>{ch}</span>;
        return (
          <span key={i} className="group/hj relative">
            <span>{ch}</span>
            <span className="hidden group-hover/hj:block absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-20 w-max bg-white border border-stone-200 text-stone-700 text-base font-normal rounded-lg px-3 py-2 shadow-md">
              {meaning}
            </span>
          </span>
        );
      })}
    </span>
  );
}
