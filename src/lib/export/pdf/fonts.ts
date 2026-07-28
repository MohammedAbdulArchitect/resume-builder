import path from "node:path";
import { Font } from "@react-pdf/renderer";
// @ts-expect-error @react-pdf/pdfkit ships no type declarations
import PDFDocument from "@react-pdf/pdfkit";

/**
 * Approved-font compliance (PRODUCT_SPEC_FINAL.md §12 / A6): the approved
 * list is Inter, Calibri, Arial, Georgia, Source Sans, Lato. Inter, Lato,
 * and Source Sans are genuinely on that list and OFL-licensed, so we embed
 * them directly. Georgia (Monotype) and Calibri/Arial (Microsoft) are
 * proprietary and cannot legally be bundled as font files in this repo.
 * For the one template wanting a serif ("Professional"), we embed
 * **Gelasio** — Google's metrically-compatible, OFL-licensed open-source
 * substitute for Georgia — rather than an illegal Georgia embed or a
 * generic fallback that isn't on the approved list at all.
 */
export const FONT_FAMILIES = {
  inter: "Inter",
  lato: "Lato",
  sourceSans: "Source Sans 3",
  gelasio: "Gelasio", // Georgia substitute
} as const;

export type FontFamilyKey = keyof typeof FONT_FAMILIES;

interface FontSpec {
  family: string;
  pkg: string; // @fontsource package directory name
  file: string; // file name prefix used in that package's files/
}

const FONT_SPECS: FontSpec[] = [
  { family: FONT_FAMILIES.inter, pkg: "inter", file: "inter" },
  { family: FONT_FAMILIES.lato, pkg: "lato", file: "lato" },
  { family: FONT_FAMILIES.sourceSans, pkg: "source-sans-3", file: "source-sans-3" },
  { family: FONT_FAMILIES.gelasio, pkg: "gelasio", file: "gelasio" },
];

// react-pdf's font embedding supports TTF/OTF/WOFF reliably (not WOFF2) —
// @fontsource ships plain .woff alongside .woff2, so we point at that.
function fontFilePath(pkg: string, file: string, weight: 400 | 700): string {
  return path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    pkg,
    "files",
    `${file}-latin-${weight}-normal.woff`,
  );
}

let registered = false;
let ligaturesDisabled = false;

interface EmbeddedFontLike {
  layoutRun(text: string, features?: unknown): unknown;
}

// @react-pdf/pdfkit's embedded-font ToUnicode CMap generation does not
// reliably survive ligature substitution: fonts whose GSUB table defines a
// "fi" (or similar) ligature glyph — Lato, Gelasio, and Source Sans 3 all
// do; Inter doesn't — come back from PDF text re-extraction with a
// character silently dropped ("Certificate" -> "Certifcate", "five" ->
// "fve"). That's silent corruption of exactly the text our own ATS
// re-extraction assertion (and any real ATS) depends on, so it can't be
// left as a cosmetic issue. There's no public react-pdf/pdfkit API to turn
// ligatures off per Text — the only lever is fontkit's own
// EmbeddedFont#layoutRun(text, features), which pdfkit never calls with an
// explicit `features` argument. All embedded (non-standard) fonts share one
// EmbeddedFont class instance-per-process, so patching its prototype once,
// via a throwaway probe document, disables ligatures for every template.
function disablePdfLigatures(): void {
  if (ligaturesDisabled) return;
  ligaturesDisabled = true;

  const probeDoc = new PDFDocument({ autoFirstPage: false }) as unknown as {
    font(src: string): void;
    _font: EmbeddedFontLike;
  };
  probeDoc.font(fontFilePath(FONT_SPECS[0].pkg, FONT_SPECS[0].file, 400));

  const proto = Object.getPrototypeOf(probeDoc._font) as EmbeddedFontLike;
  const originalLayoutRun = proto.layoutRun;
  proto.layoutRun = function (this: EmbeddedFontLike, text: string, features?: unknown) {
    return originalLayoutRun.call(
      this,
      text,
      features ?? { liga: false, clig: false, rlig: false, calt: false },
    );
  };
}

// Idempotent — safe to call from every template's .pdf.tsx module and from
// tests; registration only happens once per process.
export function registerPdfFonts(): void {
  if (registered) return;
  registered = true;

  for (const spec of FONT_SPECS) {
    Font.register({
      family: spec.family,
      fonts: [
        { src: fontFilePath(spec.pkg, spec.file, 400), fontWeight: 400 },
        { src: fontFilePath(spec.pkg, spec.file, 700), fontWeight: 700 },
      ],
    });
  }

  disablePdfLigatures();
}
