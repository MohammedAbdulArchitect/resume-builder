import { Packer } from "docx";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parseResumeData } from "@/lib/schema/resume";
import { exportTemplateRegistry } from "@/lib/export/registry";
import fresherIt from "@fixtures/fresher-it.json";

const PK_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

describe("DOCX export", () => {
  for (const template of exportTemplateRegistry) {
    it(`${template.slug}: produces a valid docx with real Word heading styles`, async () => {
      const data = parseResumeData(fresherIt);
      const doc = template.buildDocx(data, data.meta.locale);
      const buffer = await Packer.toBuffer(doc);

      expect(buffer.subarray(0, 4)).toEqual(PK_SIGNATURE);

      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file("word/document.xml")?.async("string");
      expect(documentXml).toBeDefined();

      // Real heading style reference, not just a bold run pretending to be one
      // (CLAUDE_FINAL.md §10).
      expect(documentXml).toContain('w:val="Heading2"');
      expect(documentXml).toContain(data.personal.fullName);
    });
  }
});
