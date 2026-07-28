import type { ResumeData } from "@/lib/schema/resume";

function sanitize(segment: string): string {
  return segment.replace(/[^A-Za-z0-9_-]+/g, "");
}

// phase4.md: `FirstName_LastName_Resume`. CLAUDE_FINAL.md §10:
// `FirstName_LastName_Role_Resume`. Reconciled: include the role segment
// only when meta.targetRole is actually set (it usually won't be yet,
// since JD-tailoring doesn't exist until Phase 6).
export function buildExportFilename(data: ResumeData, format: "pdf" | "docx"): string {
  const name = data.personal.fullName?.trim();
  const parts = name ? name.split(/\s+/) : [];
  const first = parts[0] ? sanitize(parts[0]) : "";
  const rest = sanitize(parts.slice(1).join("_"));
  const base = [first, rest].filter(Boolean).join("_") || "Resume";

  const role = data.meta.targetRole ? sanitize(data.meta.targetRole.replace(/\s+/g, "_")) : undefined;

  const segments = [base, role, "Resume"].filter((s): s is string => Boolean(s));
  return `${segments.join("_")}.${format}`;
}
