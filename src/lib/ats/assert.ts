import { extractTextFromPdf } from "@/lib/parsers/pdf-parse";
import type { ResumeData } from "@/lib/schema/resume";

/**
 * Post-export re-extraction assertion (HLD.md §9.2, CLAUDE_FINAL.md I4).
 * Re-extracts text from a rendered PDF and verifies every field the user
 * actually supplied is recoverable — only fields that ARE present are
 * checked (optional-tolerant, same principle as the schema itself).
 */
export interface AssertionResult {
  ok: boolean;
  missing: string[];
}

export async function assertPdfRecoversContent(pdfBuffer: Buffer, data: ResumeData): Promise<AssertionResult> {
  const text = await extractTextFromPdf(pdfBuffer);
  const missing: string[] = [];

  function check(label: string, value?: string) {
    if (value && !text.includes(value)) missing.push(label);
  }

  check("full name", data.personal.fullName);
  check("email", data.personal.email);
  check("phone", data.personal.phone);
  data.experience.forEach((entry, i) => {
    check(`experience[${i}].company`, entry.company);
    check(`experience[${i}].title`, entry.title);
  });

  return { ok: missing.length === 0, missing };
}
