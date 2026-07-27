import type { TemplateDefinition } from "@/templates/types";
import { AtsPlainTemplate } from "@/templates/ats-plain";

export const templateRegistry: TemplateDefinition[] = [
  {
    slug: "ats-plain",
    name: "ATS Plain",
    description: "Maximum parser safety — single column, no tables, standard headings.",
    component: AtsPlainTemplate,
  },
];

export function getTemplate(slug: string): TemplateDefinition | undefined {
  return templateRegistry.find((t) => t.slug === slug);
}
