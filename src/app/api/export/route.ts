import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Packer } from "docx";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getOwnedResume } from "@/lib/db/resumes";
import { getExportTemplate } from "@/lib/export/registry";
import { pdfRenderQueue } from "@/lib/export/pdf/queue";
import { assertPdfRecoversContent } from "@/lib/ats/assert";
import { buildExportFilename } from "@/lib/export/filename";

// Both tiers, zero model calls — unlimited, unwatermarked downloads
// (PRODUCT_SPEC_FINAL.md §5). PDF and DOCX generated from the same
// ResumeData (HLD.md §9.1).
const exportRequestSchema = z.object({
  resumeId: z.string(),
  format: z.enum(["pdf", "docx"]),
  template: z.string(),
});

export async function POST(request: Request) {
  const session = await auth();
  const accountId = session?.user?.accountId;
  if (!accountId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const bodyResult = exportRequestSchema.safeParse(rawBody);
  if (!bodyResult.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const { resumeId, format, template: templateSlug } = bodyResult.data;

  const resume = await getOwnedResume(accountId, resumeId);
  if (!resume) {
    return Response.json({ error: "Resume not found" }, { status: 404 });
  }

  const template = getExportTemplate(templateSlug);
  if (!template) {
    return Response.json({ error: "Unknown template" }, { status: 400 });
  }

  const filename = buildExportFilename(resume.data, format);

  if (format === "pdf") {
    let buffer: Buffer;
    try {
      buffer = await pdfRenderQueue.run(() =>
        renderToBuffer(
          createElement(template.pdfComponent, {
            data: resume.data,
            locale: resume.data.meta.locale,
          }) as unknown as ReactElement<DocumentProps>,
        ),
      );
    } catch {
      return Response.json({ error: "Could not render PDF" }, { status: 500 });
    }

    // Post-export re-extraction assertion (HLD §9.2, CLAUDE_FINAL I4) —
    // fail loudly, never stream a PDF that doesn't recover its own content.
    const assertion = await assertPdfRecoversContent(buffer, resume.data);
    if (!assertion.ok) {
      return Response.json(
        {
          error: "Export failed ATS validation — the generated PDF did not recover all expected content",
          missing: assertion.missing,
        },
        { status: 500 },
      );
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  let buffer: Buffer;
  try {
    const doc = template.buildDocx(resume.data, resume.data.meta.locale);
    buffer = await Packer.toBuffer(doc);
  } catch {
    return Response.json({ error: "Could not render DOCX" }, { status: 500 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
