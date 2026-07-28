import { BorderStyle, HeadingLevel, Paragraph, TabStopPosition, TabStopType, TextRun } from "docx";
import type { ProvenancedText } from "@/lib/schema/resume";

/**
 * Shared docx building blocks, parameterized by a per-template theme.
 * Real Word styles (HeadingLevel, genuine bullet paragraphs), not bold
 * runs pretending to be headings (CLAUDE_FINAL §10).
 */

export interface DocxTheme {
  font: string;
  accentColorHex: string; // no leading '#'
  mutedColorHex: string;
  sectionHeadingAccentBorder?: boolean; // thin accent rule above the heading (Modern Clean)
  sectionHeadingCentered?: boolean; // centered heading text (Professional)
  density?: "normal" | "compact"; // smaller sizes/spacing throughout (Compact)
}

export const DEFAULT_MUTED_HEX = "595959";

function densitySizes(theme: DocxTheme) {
  const compact = theme.density === "compact";
  return {
    headingSize: compact ? 18 : 20,
    bodySize: compact ? 17 : 19,
    titleSize: compact ? 19 : 21,
    metaSize: compact ? 16 : 18,
    spacingBefore: compact ? 100 : 200,
    spacingAfter: compact ? 40 : 80,
    bulletSpacingAfter: compact ? 10 : 40,
  };
}

export function docxSectionHeading(theme: DocxTheme, text: string): Paragraph {
  const s = densitySizes(theme);
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: s.spacingBefore, after: s.spacingAfter },
    alignment: theme.sectionHeadingCentered ? "center" : "left",
    border: theme.sectionHeadingAccentBorder
      ? { top: { style: BorderStyle.SINGLE, size: 6, color: theme.accentColorHex, space: 4 } }
      : undefined,
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        font: theme.font,
        size: s.headingSize,
        color: theme.accentColorHex,
      }),
    ],
  });
}

export function docxBullets(theme: DocxTheme, items: (ProvenancedText | string)[]): Paragraph[] {
  const s = densitySizes(theme);
  return items.map(
    (item) =>
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: s.bulletSpacingAfter },
        children: [
          new TextRun({
            text: typeof item === "string" ? item : item.text,
            font: theme.font,
            size: s.bodySize,
          }),
        ],
      }),
  );
}

// A title line with the date range right-tab-aligned to the page's usable
// width, plus an optional muted meta line underneath (company/location or
// institution/grade).
export function docxEntryHeader(theme: DocxTheme, title: string, dateRange?: string, meta?: string): Paragraph[] {
  const s = densitySizes(theme);
  const paragraphs: Paragraph[] = [
    new Paragraph({
      spacing: { before: s.spacingBefore / 2, after: 20 },
      tabStops: dateRange ? [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }] : undefined,
      children: [
        new TextRun({ text: title, bold: true, font: theme.font, size: s.titleSize }),
        ...(dateRange
          ? [new TextRun({ text: `\t${dateRange}`, font: theme.font, size: s.metaSize, color: theme.mutedColorHex })]
          : []),
      ],
    }),
  ];
  if (meta) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: s.spacingAfter / 2 },
        children: [new TextRun({ text: meta, font: theme.font, size: s.metaSize, color: theme.mutedColorHex })],
      }),
    );
  }
  return paragraphs;
}

export function docxPlainParagraph(theme: DocxTheme, text: string, opts?: { size?: number; color?: string }): Paragraph {
  const s = densitySizes(theme);
  return new Paragraph({
    spacing: { after: s.spacingAfter },
    children: [new TextRun({ text, font: theme.font, size: opts?.size ?? s.bodySize, color: opts?.color })],
  });
}
