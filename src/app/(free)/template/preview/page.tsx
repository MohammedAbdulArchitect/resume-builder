import { parseResumeData } from "@/lib/schema/resume";
import { getTemplate } from "@/templates/registry";
import fixture from "@fixtures/experienced-non-it.json";

// Phase 1: preview only, single hardcoded fixture. Phase 4 adds the full
// gallery, template switching, and live ATS score display.
export default function TemplatePreviewPage() {
  const data = parseResumeData(fixture);
  const template = getTemplate("ats-plain");

  if (!template) {
    throw new Error("ats-plain template is not registered");
  }

  const Template = template.component;

  return (
    <main className="flex-1 bg-neutral-100 p-8">
      <Template data={data} locale={data.meta.locale} />
    </main>
  );
}
