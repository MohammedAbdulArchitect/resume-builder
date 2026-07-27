import { auth } from "@/lib/auth";
import { getAccountById } from "@/lib/db/accounts";
import { createResume } from "@/lib/db/resumes";
import { detectExtension, parseUploadedFile } from "@/lib/parsers";
import type { Locale } from "@/lib/schema/resume";

// Free tier, zero model calls (CLAUDE_FINAL.md I5). Regex/heuristic
// extraction only — no path here reaches src/lib/ai.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  const accountId = session?.user?.accountId;
  if (!accountId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_BYTES * 1.5) {
    return Response.json({ error: "File exceeds the 10MB limit" }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const extension = detectExtension(file.name);
  if (!extension) {
    return Response.json({ error: "Unsupported file type — use PDF, DOCX, or TXT" }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_BYTES) {
    return Response.json({ error: "File exceeds the 10MB limit" }, { status: 413 });
  }

  const account = await getAccountById(accountId);
  const locale: Locale = account?.locale === "intl" ? "intl" : "in";

  let result;
  try {
    result = await parseUploadedFile({ buffer, filename: file.name, locale });
  } catch {
    return Response.json({ error: "Could not read that file — try a different export of your resume" }, { status: 422 });
  }

  const title = result.data.personal.fullName
    ? `${result.data.personal.fullName} — Resume`
    : "Untitled Resume";

  const { id } = await createResume({ accountId, title, data: result.data });

  return Response.json({ resumeId: id, resumeData: result.data, unassigned: result.unassigned });
}
