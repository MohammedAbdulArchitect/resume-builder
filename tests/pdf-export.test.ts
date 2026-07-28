import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { parseResumeData } from "@/lib/schema/resume";
import { exportTemplateRegistry } from "@/lib/export/registry";
import { assertPdfRecoversContent } from "@/lib/ats/assert";
import { extractTextFromPdf } from "@/lib/parsers/pdf-parse";
import fresherIt from "@fixtures/fresher-it.json";
import experiencedNonIt from "@fixtures/experienced-non-it.json";
import careerChanger from "@fixtures/career-changer.json";

describe("PDF export ATS re-extraction assertion", () => {
  for (const template of exportTemplateRegistry) {
    it(`${template.slug}: generated PDF recovers all expected content`, async () => {
      const data = parseResumeData(fresherIt);
      const buffer = await renderToBuffer(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createElement(template.pdfComponent, { data, locale: data.meta.locale }) as any,
      );
      const result = await assertPdfRecoversContent(buffer, data);
      expect(result.missing).toEqual([]);
      expect(result.ok).toBe(true);
    });
  }

  it("fails loudly when checked against content the PDF doesn't contain", async () => {
    const template = exportTemplateRegistry[0];
    const dataInPdf = parseResumeData(fresherIt);
    const otherData = parseResumeData(experiencedNonIt);

    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(template.pdfComponent, { data: dataInPdf, locale: dataInPdf.meta.locale }) as any,
    );

    const result = await assertPdfRecoversContent(buffer, otherData);
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.missing).toContain("full name");
  });

  // Regression test: @react-pdf/pdfkit's ToUnicode CMap for
  // ligature-substituted glyphs doesn't reliably round-trip on
  // re-extraction for fonts whose GSUB table defines ligatures (Lato,
  // Gelasio, Source Sans 3 all do; Inter doesn't) — "Certificate" and
  // "identify" would silently come back as "Certifcate" / "identfy". This
  // isn't covered by assertPdfRecoversContent (which only checks
  // name/email/phone/company/title), so check the education and summary
  // text directly. src/lib/export/pdf/fonts.ts disables ligatures globally
  // to fix this.
  for (const template of exportTemplateRegistry) {
    it(`${template.slug}: recovers ligature-prone words ("Certificate", "identify") intact`, async () => {
      const data = parseResumeData(careerChanger);
      const buffer = await renderToBuffer(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createElement(template.pdfComponent, { data, locale: data.meta.locale }) as any,
      );
      const text = (await extractTextFromPdf(buffer)).replace(/\s+/g, " ");
      expect(text).toContain("Certificate");
      expect(text).toContain("identify");
    });
  }
});
