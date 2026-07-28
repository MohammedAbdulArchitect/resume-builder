// Shared across all template previews/PDF/DOCX variants — dates are
// free-form strings (HLD §5.1), never reformatted into a canonical shape.
export function formatDateRange(start?: string, end?: string, current?: boolean): string {
  const from = start ?? "";
  const to = current ? "Present" : (end ?? "");
  if (!from && !to) return "";
  return [from, to].filter(Boolean).join(" – ");
}
