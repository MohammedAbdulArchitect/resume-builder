import { BorderStyle, Document, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
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

const ACCENT = "0f766e";
const mainTheme: DocxTheme = { font: "Inter", accentColorHex: ACCENT, mutedColorHex: "595959" };
const sidebarTheme: DocxTheme = { font: "Inter", accentColorHex: ACCENT, mutedColorHex: "3f6212" };

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const CELL_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

// A borderless table for pure layout — the accepted technique for a
// two-column Word document. This is the one template that trades some ATS
// safety for a sidebar look (isSingleColumn: false in the registry), so a
// layout table here is consistent with that documented tradeoff rather
// than the "no tables" rule the other 7 templates hold to.
export function buildTwoColumnDocx(data: ResumeData, locale: Locale): Document {
  const pageSize = DOCX_PAGE_SIZES[getLocaleProfile(locale).pageSize];
  const { personal } = data;

  const sidebarLines = [personal.location, personal.email, personal.phone, ...personal.links.map((l) => l.url)].filter(
    (v): v is string => Boolean(v),
  );

  const sidebarChildren: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: personal.fullName ?? "Your Name", bold: true, font: sidebarTheme.font, size: 26, color: "134E4A" })],
    }),
    ...(personal.headline
      ? [
          new Paragraph({
            children: [new TextRun({ text: personal.headline, font: sidebarTheme.font, size: 17, color: sidebarTheme.mutedColorHex })],
          }),
        ]
      : []),
    ...sidebarLines.map(
      (line) =>
        new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: line, font: sidebarTheme.font, size: 15, color: sidebarTheme.mutedColorHex })],
        }),
    ),
    ...docxSkillsSection(sidebarTheme, data),
    ...docxLanguagesSection(sidebarTheme, data),
    ...docxCertificationsSection(sidebarTheme, data),
  ];

  const mainChildren: Paragraph[] = [
    ...docxSummarySection(mainTheme, data),
    ...docxExperienceSection(mainTheme, data),
    ...docxEducationSection(mainTheme, data),
    ...docxProjectsSection(mainTheme, data),
    ...docxAchievementsSection(mainTheme, data),
  ];
  if (mainChildren.length === 0) mainChildren.push(new Paragraph({}));

  const layoutTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...CELL_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            shading: { fill: "F0FDFA" },
            borders: CELL_BORDERS,
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            children: sidebarChildren,
          }),
          new TableCell({
            width: { size: 66, type: WidthType.PERCENTAGE },
            borders: CELL_BORDERS,
            margins: { top: 200, bottom: 200, left: 300, right: 200 },
            children: mainChildren,
          }),
        ],
      }),
    ],
  });

  return new Document({
    sections: [
      {
        properties: { page: { size: pageSize, margin: { top: 0, bottom: 720, left: 0, right: 0 } } },
        children: [layoutTable],
      },
    ],
  });
}
