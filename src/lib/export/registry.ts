import type { ComponentType } from "react";
import type { Document } from "docx";
import type { Locale, ResumeData } from "@/lib/schema/resume";
import type { TemplateProps } from "@/templates/types";

import { AtsPlainPdf } from "@/templates/ats-plain/ats-plain.pdf";
import { buildAtsPlainDocx } from "@/templates/ats-plain/ats-plain.docx";
import { ModernCleanPdf } from "@/templates/modern-clean/modern-clean.pdf";
import { buildModernCleanDocx } from "@/templates/modern-clean/modern-clean.docx";
import { ProfessionalPdf } from "@/templates/professional/professional.pdf";
import { buildProfessionalDocx } from "@/templates/professional/professional.docx";
import { CompactPdf } from "@/templates/compact/compact.pdf";
import { buildCompactDocx } from "@/templates/compact/compact.docx";
import { FresherFocusPdf } from "@/templates/fresher-focus/fresher-focus.pdf";
import { buildFresherFocusDocx } from "@/templates/fresher-focus/fresher-focus.docx";
import { ExecutivePdf } from "@/templates/executive/executive.pdf";
import { buildExecutiveDocx } from "@/templates/executive/executive.docx";
import { AcademicCvPdf } from "@/templates/academic-cv/academic-cv.pdf";
import { buildAcademicCvDocx } from "@/templates/academic-cv/academic-cv.docx";
import { TwoColumnPdf } from "@/templates/two-column/two-column.pdf";
import { buildTwoColumnDocx } from "@/templates/two-column/two-column.docx";

/**
 * SERVER-ONLY. Maps template slug -> the heavy react-pdf/docx renderers.
 * Import this only from src/app/api/export/route.ts (and export-focused
 * tests) — never from a client component. src/templates/registry.ts is the
 * client-safe counterpart (preview + ATS flags) that review-form.tsx and
 * the gallery actually import; keeping these separate is what stops
 * @react-pdf/renderer and docx from leaking into the browser bundle.
 */
export interface ExportTemplateDefinition {
  slug: string;
  pdfComponent: ComponentType<TemplateProps>;
  buildDocx: (data: ResumeData, locale: Locale) => Document;
}

export const exportTemplateRegistry: ExportTemplateDefinition[] = [
  { slug: "ats-plain", pdfComponent: AtsPlainPdf, buildDocx: buildAtsPlainDocx },
  { slug: "modern-clean", pdfComponent: ModernCleanPdf, buildDocx: buildModernCleanDocx },
  { slug: "professional", pdfComponent: ProfessionalPdf, buildDocx: buildProfessionalDocx },
  { slug: "compact", pdfComponent: CompactPdf, buildDocx: buildCompactDocx },
  { slug: "fresher-focus", pdfComponent: FresherFocusPdf, buildDocx: buildFresherFocusDocx },
  { slug: "executive", pdfComponent: ExecutivePdf, buildDocx: buildExecutiveDocx },
  { slug: "academic-cv", pdfComponent: AcademicCvPdf, buildDocx: buildAcademicCvDocx },
  { slug: "two-column", pdfComponent: TwoColumnPdf, buildDocx: buildTwoColumnDocx },
];

export function getExportTemplate(slug: string): ExportTemplateDefinition | undefined {
  return exportTemplateRegistry.find((t) => t.slug === slug);
}
