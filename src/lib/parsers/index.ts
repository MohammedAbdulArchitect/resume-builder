import { extractTextFromPdf } from "@/lib/parsers/pdf-parse";
import { extractTextFromDocx } from "@/lib/parsers/docx";
import { parseResumeText } from "@/lib/parsers/regex";
import type { Locale } from "@/lib/schema/resume";
import type { ParseResult } from "@/lib/parsers/types";

export type SupportedExtension = "pdf" | "docx" | "txt";

export function detectExtension(filename: string): SupportedExtension | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf" || ext === "docx" || ext === "txt") return ext;
  return null;
}

export interface ParseUploadedFileInput {
  buffer: Buffer;
  filename: string;
  locale: Locale;
}

// Dispatches to the right zero-model extractor, then the shared heuristic
// section parser. No path here ever touches src/lib/ai.
export async function parseUploadedFile({ buffer, filename, locale }: ParseUploadedFileInput): Promise<ParseResult> {
  const extension = detectExtension(filename);
  if (!extension) {
    throw new Error(`Unsupported file type: ${filename}`);
  }

  let text: string;
  switch (extension) {
    case "pdf":
      text = await extractTextFromPdf(buffer);
      break;
    case "docx":
      text = await extractTextFromDocx(buffer);
      break;
    case "txt":
      text = buffer.toString("utf8");
      break;
  }

  return parseResumeText(text, locale);
}
