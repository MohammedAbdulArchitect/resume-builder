import { Document, Paragraph, TextRun } from "docx";
import type { Locale, ResumeData } from "@/lib/schema/resume";
import { DOCX_PAGE_SIZES } from "@/lib/export/docx/page-size";
import type { DocxTheme } from "@/lib/export/docx/blocks";
import {
  docxAchievementsSection,
  docxCertificationsSection,
  docxEducationSection,
  docxExperienceSection,
  docxLanguagesSection,
  docxProjectsSection,
  docxSkillsSection,
  docxSummarySection,
} from "@/lib/export/docx/sections";
import { getLocaleProfile } from "@/lib/locale";

const theme: DocxTheme = {
  font: "Inter",
  accentColorHex: "111827",
  mutedColorHex: "595959",
  density: "compact",
};

export function buildCompactDocx(data: ResumeData, locale: Locale): Document {
  const pageSize = DOCX_PAGE_SIZES[getLocaleProfile(locale).pageSize];
  const { personal } = data;

  const contactLine = [personal.location, personal.email, personal.phone].filter(Boolean).join("   •   ");
  const linkLine = personal.links.map((l) => l.url).join("   •   ");

  return new Document({
    sections: [
      {
        properties: {
          page: { size: pageSize, margin: { top: 500, bottom: 500, left: 560, right: 560 } },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: personal.fullName ?? "Your Name", bold: true, font: theme.font, size: 28 })],
          }),
          ...(personal.headline
            ? [
                new Paragraph({
                  children: [new TextRun({ text: personal.headline, font: theme.font, size: 19, color: theme.mutedColorHex })],
                }),
              ]
            : []),
          ...(contactLine
            ? [
                new Paragraph({
                  spacing: { after: 20 },
                  children: [new TextRun({ text: contactLine, font: theme.font, size: 16, color: theme.mutedColorHex })],
                }),
              ]
            : []),
          ...(linkLine
            ? [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [new TextRun({ text: linkLine, font: theme.font, size: 16, color: theme.mutedColorHex })],
                }),
              ]
            : []),
          ...docxSummarySection(theme, data),
          ...docxExperienceSection(theme, data),
          ...docxEducationSection(theme, data),
          ...docxProjectsSection(theme, data),
          ...docxSkillsSection(theme, data),
          ...docxCertificationsSection(theme, data),
          ...docxAchievementsSection(theme, data),
          ...docxLanguagesSection(theme, data),
        ],
      },
    ],
  });
}
