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
const SIDEBAR_HEADING = "mb-2 text-xs font-bold uppercase tracking-wide text-[#0f766e]";
const MAIN_HEADING = "mb-2 text-sm font-bold uppercase tracking-wide text-neutral-900";

// Sidebar layout — the one template flagged with reduced ATS safety
// (isSingleColumn: false in the registry). Contact/Skills/Languages/
// Certifications live in the sidebar; Summary/Experience/Education/
// Projects/Achievements in the main column.
export function TwoColumnTemplate({ data }: TemplateProps) {
  const { personal } = data;

  return (
    <article className={`${inter.className} mx-auto flex max-w-[8.5in] bg-white text-neutral-900`}>
      <aside className="w-[34%] shrink-0 border-r border-neutral-200 bg-neutral-50 p-6">
        <h1 className="text-xl font-bold">{personal.fullName ?? "Your Name"}</h1>
        {personal.headline ? <p className="mt-1 text-sm text-neutral-600">{personal.headline}</p> : null}
        <div className="mt-4 flex flex-col gap-1 text-xs text-neutral-600">
          {personal.location ? <p>{personal.location}</p> : null}
          {personal.email ? <p>{personal.email}</p> : null}
          {personal.phone ? <p>{personal.phone}</p> : null}
          {personal.links.map((l, i) => (
            <p key={i}>{l.url}</p>
          ))}
        </div>

        <div className="mt-6">
          <SkillsSection data={data} headingClassName={SIDEBAR_HEADING} />
          <LanguagesSection data={data} headingClassName={SIDEBAR_HEADING} />
          <CertificationsSection data={data} headingClassName={SIDEBAR_HEADING} />
        </div>
      </aside>

      <div className="w-[66%] p-8">
        <SummarySection data={data} headingClassName={MAIN_HEADING} />
        <ExperienceSection data={data} headingClassName={MAIN_HEADING} />
        <EducationSection data={data} headingClassName={MAIN_HEADING} />
        <ProjectsSection data={data} headingClassName={MAIN_HEADING} />
        <AchievementsSection data={data} headingClassName={MAIN_HEADING} />
      </div>
    </article>
  );
}
