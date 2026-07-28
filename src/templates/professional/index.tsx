import { Gelasio } from "next/font/google";
import type { TemplateProps } from "@/templates/types";
import {
  AchievementsSection,
  CertificationsSection,
  EducationSection,
  ExperienceSection,
  LanguagesSection,
  ProjectsSection,
  SkillsSection,
  SummarySection,
} from "@/templates/shared/sections";

// Gelasio is Google's metrically-compatible, OFL-licensed open-source
// substitute for Georgia (proprietary, not legally embeddable) — see
// src/lib/export/pdf/fonts.ts for the full reasoning.
const gelasio = Gelasio({ subsets: ["latin"] });
const HEADING_CLASS =
  "mb-2 border-t border-neutral-400 pt-1 text-center text-sm font-bold uppercase tracking-wide text-neutral-900";

export function ProfessionalTemplate({ data }: TemplateProps) {
  const { personal } = data;
  const contactLine = [personal.location, personal.email, personal.phone]
    .filter((v): v is string => Boolean(v))
    .join(" • ");
  const linkLine = personal.links.map((l) => l.url).join(" • ");

  return (
    <article className={`${gelasio.className} mx-auto max-w-[8.5in] bg-white p-12 text-neutral-900`}>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{personal.fullName ?? "Your Name"}</h1>
        {personal.headline ? <p className="mt-1 text-base text-neutral-600">{personal.headline}</p> : null}
        {contactLine ? <p className="mt-2 text-sm text-neutral-600">{contactLine}</p> : null}
        {linkLine ? <p className="text-sm text-neutral-600">{linkLine}</p> : null}
      </header>

      <SummarySection data={data} headingClassName={HEADING_CLASS} />
      <ExperienceSection data={data} headingClassName={HEADING_CLASS} />
      <EducationSection data={data} headingClassName={HEADING_CLASS} />
      <ProjectsSection data={data} headingClassName={HEADING_CLASS} />
      <SkillsSection data={data} headingClassName={HEADING_CLASS} />
      <CertificationsSection data={data} headingClassName={HEADING_CLASS} />
      <AchievementsSection data={data} headingClassName={HEADING_CLASS} />
      <LanguagesSection data={data} headingClassName={HEADING_CLASS} />
    </article>
  );
}
