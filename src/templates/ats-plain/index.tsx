import { Inter } from "next/font/google";
import type { TemplateProps } from "@/templates/types";
import { formatDateRange } from "@/templates/shared/date-range";

// Inter is on the approved font list (PRODUCT_SPEC_FINAL.md §12 / A6).
// Scoped to this template only — the app chrome may use a different font.
const inter = Inter({ subsets: ["latin"] });

export function AtsPlainTemplate({ data }: TemplateProps) {
  const { personal, summary, experience, education, skills, projects, certifications, achievements, languages } =
    data;

  const contactLine = [personal.location, personal.email, personal.phone]
    .filter((v): v is string => Boolean(v))
    .join(" • ");

  const linkLine = personal.links.map((l) => l.url).join(" • ");

  return (
    <article
      className={`${inter.className} mx-auto max-w-[8.5in] bg-white p-10 text-neutral-900`}
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{personal.fullName ?? "Your Name"}</h1>
        {personal.headline ? <p className="text-base text-neutral-700">{personal.headline}</p> : null}
        {contactLine ? <p className="mt-1 text-sm text-neutral-700">{contactLine}</p> : null}
        {linkLine ? <p className="text-sm text-neutral-700">{linkLine}</p> : null}
      </header>

      {summary ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Summary</h2>
          <p className="text-sm leading-relaxed">{summary.text}</p>
        </section>
      ) : null}

      {experience.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Experience</h2>
          <div className="flex flex-col gap-4">
            {experience.map((entry, i) => (
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
      ) : null}

      {education.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Education</h2>
          <div className="flex flex-col gap-3">
            {education.map((entry, i) => (
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
      ) : null}

      {projects.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Projects</h2>
          <div className="flex flex-col gap-4">
            {projects.map((entry, i) => (
              <div key={i}>
                <div className="text-sm font-semibold">
                  {entry.name}
                  {entry.role ? ` — ${entry.role}` : ""}
                </div>
                {entry.description ? <p className="text-sm">{entry.description}</p> : null}
                {entry.stack.length > 0 ? (
                  <p className="text-xs text-neutral-600">{entry.stack.join(", ")}</p>
                ) : null}
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
      ) : null}

      {skills.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Skills</h2>
          <p className="text-sm leading-relaxed">{skills.map((s) => s.name).join(", ")}</p>
        </section>
      ) : null}

      {certifications.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Certifications</h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed">
            {certifications.map((c, i) => (
              <li key={i}>
                {c.name}
                {c.issuer ? ` — ${c.issuer}` : ""}
                {c.date ? ` (${c.date})` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {achievements.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Achievements</h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed">
            {achievements.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {languages.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Languages</h2>
          <p className="text-sm leading-relaxed">
            {languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ")}
          </p>
        </section>
      ) : null}
    </article>
  );
}
