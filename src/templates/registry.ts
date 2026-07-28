import type { TemplateDefinition } from "@/templates/types";
import { AtsPlainTemplate } from "@/templates/ats-plain";
import { ModernCleanTemplate } from "@/templates/modern-clean";
import { ProfessionalTemplate } from "@/templates/professional";
import { CompactTemplate } from "@/templates/compact";
import { FresherFocusTemplate } from "@/templates/fresher-focus";
import { ExecutiveTemplate } from "@/templates/executive";
import { AcademicCvTemplate } from "@/templates/academic-cv";
import { TwoColumnTemplate } from "@/templates/two-column";

// Client-safe: previews + ATS-scoring flags only. Never import
// @react-pdf/renderer or docx here — see src/lib/export/registry.ts for
// the server-only counterpart that does. This file is imported by client
// components (review-form.tsx, the template gallery) for live preview and
// scoring, so it must stay light.
export const templateRegistry: TemplateDefinition[] = [
  {
    slug: "ats-plain",
    name: "ATS Plain",
    description: "Maximum parser safety — single column, no tables, standard headings.",
    component: AtsPlainTemplate,
    isSingleColumn: true,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
  },
  {
    slug: "modern-clean",
    name: "Modern Clean",
    description: "Thin accent rule, generous whitespace.",
    component: ModernCleanTemplate,
    isSingleColumn: true,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
  },
  {
    slug: "professional",
    name: "Professional",
    description: "Conservative serif, centered header, horizontal-rule dividers.",
    component: ProfessionalTemplate,
    isSingleColumn: true,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
  },
  {
    slug: "compact",
    name: "Compact",
    description: "Dense single-page layout for longer histories.",
    component: CompactTemplate,
    isSingleColumn: true,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
  },
  {
    slug: "fresher-focus",
    name: "Fresher Focus",
    description: "Education and projects lead, ahead of experience.",
    component: FresherFocusTemplate,
    isSingleColumn: true,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
  },
  {
    slug: "executive",
    name: "Executive",
    description: "Leadership summary and achievements promoted up top.",
    component: ExecutiveTemplate,
    isSingleColumn: true,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
  },
  {
    slug: "academic-cv",
    name: "Academic CV",
    description: "Publications section, tolerant of multi-page CVs.",
    component: AcademicCvTemplate,
    isSingleColumn: true,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
  },
  {
    slug: "two-column",
    name: "Two-Column",
    description: "Sidebar layout — reduced ATS safety, flagged accordingly.",
    component: TwoColumnTemplate,
    isSingleColumn: false,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
  },
];

export function getTemplate(slug: string): TemplateDefinition | undefined {
  return templateRegistry.find((t) => t.slug === slug);
}
