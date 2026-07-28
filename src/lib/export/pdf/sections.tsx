import { Text, View } from "@react-pdf/renderer";
import type { ResumeData } from "@/lib/schema/resume";
import { formatDateRange } from "@/templates/shared/date-range";
import { densitySizes, PdfBullets, PdfEntryHeader, PdfPlainList, PdfSectionHeading, type PdfTheme } from "@/lib/export/pdf/blocks";

/**
 * Pre-composed section renderers built on the blocks in ./blocks.tsx. Most
 * templates just arrange these in whatever order/columns they want —
 * dramatically cuts the per-template code down to "theme + arrangement"
 * instead of re-implementing every section 8 times.
 */

export function PdfSummarySection({ theme, data }: { theme: PdfTheme; data: ResumeData }) {
  if (!data.summary) return null;
  const { sectionSpacing, bodySize } = densitySizes(theme);
  return (
    <View style={{ marginBottom: sectionSpacing }}>
      <PdfSectionHeading theme={theme}>Summary</PdfSectionHeading>
      <Text style={{ fontSize: bodySize, lineHeight: 1.35, color: theme.textColor }}>{data.summary.text}</Text>
    </View>
  );
}

export function PdfExperienceSection({ theme, data }: { theme: PdfTheme; data: ResumeData }) {
  if (data.experience.length === 0) return null;
  const { sectionSpacing } = densitySizes(theme);
  return (
    <View style={{ marginBottom: sectionSpacing }}>
      <PdfSectionHeading theme={theme}>Experience</PdfSectionHeading>
      {data.experience.map((entry, i) => (
        <View key={i} wrap={false} style={{ marginTop: i === 0 ? 0 : sectionSpacing / 2 }}>
          <PdfEntryHeader
            theme={theme}
            title={[entry.title, entry.company].filter(Boolean).join(", ") || "—"}
            meta={entry.location}
            dateRange={formatDateRange(entry.start, entry.end, entry.current)}
          />
          <PdfBullets theme={theme} items={entry.bullets} />
        </View>
      ))}
    </View>
  );
}

export function PdfEducationSection({ theme, data }: { theme: PdfTheme; data: ResumeData }) {
  if (data.education.length === 0) return null;
  const { sectionSpacing } = densitySizes(theme);
  return (
    <View style={{ marginBottom: sectionSpacing }}>
      <PdfSectionHeading theme={theme}>Education</PdfSectionHeading>
      {data.education.map((entry, i) => (
        <View key={i} wrap={false} style={{ marginTop: i === 0 ? 0 : sectionSpacing / 2 }}>
          <PdfEntryHeader
            theme={theme}
            title={[entry.degree, entry.field].filter(Boolean).join(", ") || "—"}
            meta={[entry.institution, entry.grade].filter(Boolean).join(" • ")}
            dateRange={formatDateRange(entry.start, entry.end)}
          />
          <PdfBullets theme={theme} items={entry.highlights} />
        </View>
      ))}
    </View>
  );
}

export function PdfProjectsSection({ theme, data }: { theme: PdfTheme; data: ResumeData }) {
  if (data.projects.length === 0) return null;
  const { sectionSpacing } = densitySizes(theme);
  return (
    <View style={{ marginBottom: sectionSpacing }}>
      <PdfSectionHeading theme={theme}>Projects</PdfSectionHeading>
      {data.projects.map((entry, i) => (
        <View key={i} wrap={false} style={{ marginTop: i === 0 ? 0 : sectionSpacing / 2 }}>
          <PdfEntryHeader
            theme={theme}
            title={[entry.name, entry.role].filter(Boolean).join(" — ") || "—"}
            meta={entry.stack.length > 0 ? entry.stack.join(", ") : undefined}
          />
          <PdfBullets theme={theme} items={entry.bullets} />
        </View>
      ))}
    </View>
  );
}

export function PdfSkillsSection({ theme, data }: { theme: PdfTheme; data: ResumeData }) {
  if (data.skills.length === 0) return null;
  return (
    <View style={{ marginBottom: densitySizes(theme).sectionSpacing }}>
      <PdfSectionHeading theme={theme}>Skills</PdfSectionHeading>
      <PdfPlainList theme={theme} text={data.skills.map((s) => s.name).join(", ")} />
    </View>
  );
}

export function PdfCertificationsSection({ theme, data }: { theme: PdfTheme; data: ResumeData }) {
  if (data.certifications.length === 0) return null;
  return (
    <View style={{ marginBottom: densitySizes(theme).sectionSpacing }}>
      <PdfSectionHeading theme={theme}>Certifications</PdfSectionHeading>
      <PdfBullets
        theme={theme}
        items={data.certifications.map((c) =>
          [c.name, c.issuer ? `— ${c.issuer}` : "", c.date ? `(${c.date})` : ""].filter(Boolean).join(" "),
        )}
      />
    </View>
  );
}

export function PdfAchievementsSection({ theme, data }: { theme: PdfTheme; data: ResumeData }) {
  if (data.achievements.length === 0) return null;
  return (
    <View style={{ marginBottom: densitySizes(theme).sectionSpacing }}>
      <PdfSectionHeading theme={theme}>Achievements</PdfSectionHeading>
      <PdfBullets theme={theme} items={data.achievements} />
    </View>
  );
}

export function PdfLanguagesSection({ theme, data }: { theme: PdfTheme; data: ResumeData }) {
  if (data.languages.length === 0) return null;
  return (
    <View style={{ marginBottom: densitySizes(theme).sectionSpacing }}>
      <PdfSectionHeading theme={theme}>Languages</PdfSectionHeading>
      <PdfPlainList theme={theme} text={data.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ")} />
    </View>
  );
}

export function PdfPublicationsSection({ theme, data }: { theme: PdfTheme; data: ResumeData }) {
  if (data.publications.length === 0) return null;
  return (
    <View style={{ marginBottom: densitySizes(theme).sectionSpacing }}>
      <PdfSectionHeading theme={theme}>Publications</PdfSectionHeading>
      <PdfBullets
        theme={theme}
        items={data.publications.map((p) =>
          [p.title, p.publisher ? `— ${p.publisher}` : "", p.date ? `(${p.date})` : ""].filter(Boolean).join(" "),
        )}
      />
    </View>
  );
}
