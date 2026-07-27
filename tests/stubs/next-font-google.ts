// next/font/google relies on a Next.js build-time compiler transform that
// doesn't exist under Vitest — stub it so components using it are still
// unit-testable in jsdom.
function stubFont() {
  return { className: "", style: {}, variable: "" };
}

export const Inter = stubFont;
export const Geist = stubFont;
export const Geist_Mono = stubFont;
