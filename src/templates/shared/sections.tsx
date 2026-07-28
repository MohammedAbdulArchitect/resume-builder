import type { ResumeData } from "@/lib/schema/resume";
import { formatDateRange } from "@/templates/shared/date-range";

/**
 * Shared React preview section components (web preview only — the exported
 * PDF/DOCX have their own parallel building blocks in src/lib/export/).
 * Each template composes these with its own heading className (font/color)
 * and arrangement; passing a different `headingClassName` is how a
 * template's typographic identity comes through without duplicating markup.
 */

const DEFAULT_HEADING = "mb-2 text-sm font-bold uppercase tracking-wide";

export function SummarySection({ data, headingClassName = DEFAULT_HEADING }: { data: ResumeData; headingClassName?: string }) {
  if (!data.summary) return null;
  return (
    <section className="mb-6">
      <h2 className={headingClassName}>Summary</h2>
      <p className="text-sm leading-relaxed">{data.summary.text}</p>
    </section>
  );
}

export function ExperienceSection({ data, headingClassName = DEFAULT_HEADING }: { data: ResumeData; headingClassName?: string }) {
  if (data.experience.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className={headingClassName}>Experience</h2>
      <div className="flex flex-col gap-4">
        {data.experience.map((entry, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">
                {entry.title}
                {entry.company ? `, ${entry.company}` : ""}
              </span>
              <span className="text-neutral-600">{formatDateRange(entry.start, entry.end, entry.current)}</span>
            </div>
            {entry.location ? <p className="text-xs text-neutral-600">{entry.location}</p> : null}
            {entry.bullets.length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed">
                {entry.bullets.map((b, j) => (
                  <li key={j}>{b.text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function EducationSection({ data, headingClassName = DEFAULT_HEADING }: { data: ResumeData; headingClassName?: string }) {
  if (data.education.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className={headingClassName}>Education</h2>
      <div className="flex flex-col gap-3">
        {data.education.map((entry, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">
                {entry.degree}
                {entry.field ? `, ${entry.field}` : ""}
              </span>
              <span className="text-neutral-600">{formatDateRange(entry.start, entry.end)}</span>
            </div>
            <p className="text-xs text-neutral-600">
              {entry.institution}
              {entry.grade ? ` • ${entry.grade}` : ""}
            </p>
            {entry.highlights.length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed">
                {entry.highlights.map((h, j) => (
                  <li key={j}>{h}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProjectsSection({ data, headingClassName = DEFAULT_HEADING }: { data: ResumeData; headingClassName?: string }) {
  if (data.projects.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className={headingClassName}>Projects</h2>
      <div className="flex flex-col gap-4">
        {data.projects.map((entry, i) => (
          <div key={i}>
            <div className="text-sm font-semibold">
              {entry.name}
              {entry.role ? ` — ${entry.role}` : ""}
            </div>
            {entry.description ? <p className="text-sm">{entry.description}</p> : null}
            {entry.stack.length > 0 ? <p className="text-xs text-neutral-600">{entry.stack.join(", ")}</p> : null}
            {entry.bullets.length > 0 ? (
              <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed">
                {entry.bullets.map((b, j) => (
                  <li key={j}>{b.text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function SkillsSection({ data, headingClassName = DEFAULT_HEADING }: { data: ResumeData; headingClassName?: string }) {
  if (data.skills.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className={headingClassName}>Skills</h2>
      <p className="text-sm leading-relaxed">{data.skills.map((s) => s.name).join(", ")}</p>
    </section>
  );
}

export function CertificationsSection({ data, headingClassName = DEFAULT_HEADING }: { data: ResumeData; headingClassName?: string }) {
  if (data.certifications.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className={headingClassName}>Certifications</h2>
      <ul className="list-disc pl-5 text-sm leading-relaxed">
        {data.certifications.map((c, i) => (
          <li key={i}>
            {c.name}
            {c.issuer ? ` — ${c.issuer}` : ""}
            {c.date ? ` (${c.date})` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AchievementsSection({ data, headingClassName = DEFAULT_HEADING }: { data: ResumeData; headingClassName?: string }) {
  if (data.achievements.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className={headingClassName}>Achievements</h2>
      <ul className="list-disc pl-5 text-sm leading-relaxed">
        {data.achievements.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </section>
  );
}

export function LanguagesSection({ data, headingClassName = DEFAULT_HEADING }: { data: ResumeData; headingClassName?: string }) {
  if (data.languages.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className={headingClassName}>Languages</h2>
      <p className="text-sm leading-relaxed">
        {data.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ")}
      </p>
    </section>
  );
}

export function PublicationsSection({ data, headingClassName = DEFAULT_HEADING }: { data: ResumeData; headingClassName?: string }) {
  if (data.publications.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className={headingClassName}>Publications</h2>
      <ul className="list-disc pl-5 text-sm leading-relaxed">
        {data.publications.map((p, i) => (
          <li key={i}>
            {p.title}
            {p.publisher ? ` — ${p.publisher}` : ""}
            {p.date ? ` (${p.date})` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
