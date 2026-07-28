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
const HEADING_CLASS = "mb-2 text-sm font-bold uppercase tracking-wide text-neutral-900";

// Education + Projects promoted before Experience — for candidates whose
// strongest material is academic/project work, not a thin employment
// history. The only thing that differs from ATS Plain is section order.
export function FresherFocusTemplate({ data }: TemplateProps) {
  const { personal } = data;
  const contactLine = [personal.location, personal.email, personal.phone]
    .filter((v): v is string => Boolean(v))
    .join(" • ");
  const linkLine = personal.links.map((l) => l.url).join(" • ");

  return (
    <article className={`${inter.className} mx-auto max-w-[8.5in] bg-white p-10 text-neutral-900`}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{personal.fullName ?? "Your Name"}</h1>
        {personal.headline ? <p className="text-base text-neutral-700">{personal.headline}</p> : null}
        {contactLine ? <p className="mt-1 text-sm text-neutral-700">{contactLine}</p> : null}
        {linkLine ? <p className="text-sm text-neutral-700">{linkLine}</p> : null}
      </header>

      <SummarySection data={data} headingClassName={HEADING_CLASS} />
      <EducationSection data={data} headingClassName={HEADING_CLASS} />
      <ProjectsSection data={data} headingClassName={HEADING_CLASS} />
      <SkillsSection data={data} headingClassName={HEADING_CLASS} />
      <ExperienceSection data={data} headingClassName={HEADING_CLASS} />
      <CertificationsSection data={data} headingClassName={HEADING_CLASS} />
      <AchievementsSection data={data} headingClassName={HEADING_CLASS} />
      <LanguagesSection data={data} headingClassName={HEADING_CLASS} />
    </article>
  );
}
