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
}
