import type { ResumeData } from "@/lib/schema/resume";
import type { TemplateDefinition } from "@/templates/types";

/**
 * Client-safe ATS scoring (CLAUDE_FINAL.md §5, PRODUCT_SPEC_FINAL.md §7).
 * Pure function, no I/O, no API calls — runs entirely in the browser.
 */

const DATE_SHAPES: Array<[string, RegExp]> = [
  ["month-year", /^[A-Za-z]{3,9}\.?\s+\d{4}$/],
  ["iso-month", /^\d{4}-\d{2}$/],
  ["year-only", /^\d{4}$/],
  ["slash-date", /^\d{1,2}\/\d{4}$/],
];

function classifyDate(value: string): string {
  for (const [shape, pattern] of DATE_SHAPES) {
    if (pattern.test(value.trim())) return shape;
  }
  return "other";
}

export function hasConsistentDateFormat(data: ResumeData): boolean {
  const dates = [
    ...data.experience.flatMap((e) => [e.start, e.end]),
    ...data.education.flatMap((e) => [e.start, e.end]),
  ].filter((d): d is string => Boolean(d) && !/^present$|^current$/i.test(d ?? ""));

  if (dates.length === 0) return true;

  const shapes = new Set(dates.map(classifyDate));
  return shapes.size <= 1;
}

const MARKUP_RE = /[<>]/;

export function contactAsPlainText(data: ResumeData): boolean {
  const fields = [data.personal.email, data.personal.phone, data.personal.location];
  return fields.every((f) => !f || !MARKUP_RE.test(f));
}

export function computeAtsScore(template: TemplateDefinition, data: ResumeData): number {
  let score = 0;
  if (template.isSingleColumn) score += 25;
  if (!template.hasTableContent) score += 15;
  if (template.hasStandardHeadings) score += 20;
  if (hasConsistentDateFormat(data)) score += 15;
  if (contactAsPlainText(data)) score += 15;
  if (template.fontInApprovedList) score += 10;
  return Math.min(score, 100);
}
