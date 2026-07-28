import { BorderStyle, Document, Paragraph, TextRun } from "docx";
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
  accentColorHex: "2563eb",
  mutedColorHex: "595959",
  sectionHeadingAccentBorder: true,
};

export function buildModernCleanDocx(data: ResumeData, locale: Locale): Document {
  const pageSize = DOCX_PAGE_SIZES[getLocaleProfile(locale).pageSize];
  const { personal } = data;

  const contactLine = [personal.location, personal.email, personal.phone].filter(Boolean).join("   •   ");
  const linkLine = personal.links.map((l) => l.url).join("   •   ");

  return new Document({
    sections: [
      {
        properties: {
          page: { size: pageSize, margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children: [
          new Paragraph({
            spacing: { after: 40 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: theme.accentColorHex, space: 8 } },
            children: [new TextRun({ text: personal.fullName ?? "Your Name", bold: true, font: theme.font, size: 36 })],
          }),
          ...(personal.headline
            ? [
                new Paragraph({
                  children: [new TextRun({ text: personal.headline, font: theme.font, size: 22, color: theme.mutedColorHex })],
                }),
              ]
            : []),
          ...(contactLine
            ? [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [new TextRun({ text: contactLine, font: theme.font, size: 18, color: theme.mutedColorHex })],
                }),
              ]
            : []),
          ...(linkLine
            ? [
                new Paragraph({
                  spacing: { after: 160 },
                  children: [new TextRun({ text: linkLine, font: theme.font, size: 18, color: theme.mutedColorHex })],
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
