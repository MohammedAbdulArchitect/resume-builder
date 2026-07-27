import { extractRawText } from "mammoth";

// Free tier, no model — mammoth's raw-text extraction (CLAUDE_FINAL.md §5).
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await extractRawText({ buffer });
  return result.value;
}
