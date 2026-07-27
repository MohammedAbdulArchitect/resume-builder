import type { ComponentType } from "react";
import type { Locale, ResumeData } from "@/lib/schema/resume";

export interface TemplateTheme {
  accentColor?: string;
}

export interface TemplateProps {
  data: ResumeData;
  theme?: TemplateTheme;
  locale: Locale;
}

export interface TemplateDefinition {
  slug: string;
  name: string;
  description: string;
  component: ComponentType<TemplateProps>;
  // ATS-relevant layout facts, consumed by ats/score.ts's computeAtsScore
  // (CLAUDE_FINAL.md §5 / PRODUCT_SPEC_FINAL.md §7).
  isSingleColumn: boolean;
  hasTableContent: boolean;
  hasStandardHeadings: boolean;
  fontInApprovedList: boolean;
}
