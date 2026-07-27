import { PDFParse } from "pdf-parse";

// Free tier, no model — pure text-stream extraction (CLAUDE_FINAL.md §5).
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
