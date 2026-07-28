import { Inter } from "next/font/google";
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

const inter = Inter({ subsets: ["latin"] });
const ACCENT = "#2563eb";
const HEADING_CLASS =
  "mb-2 border-t-2 border-[#2563eb] pt-1 text-sm font-bold uppercase tracking-wide text-neutral-900";

export function ModernCleanTemplate({ data }: TemplateProps) {
  const { personal } = data;
  const contactLine = [personal.location, personal.email, personal.phone]
    .filter((v): v is string => Boolean(v))
    .join(" • ");
  const linkLine = personal.links.map((l) => l.url).join(" • ");

  return (
    <article className={`${inter.className} mx-auto max-w-[8.5in] bg-white p-12 text-neutral-900`}>
      <header className="mb-8 border-b-2 pb-4" style={{ borderColor: ACCENT }}>
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
