import { Text, View } from "@react-pdf/renderer";
import type { ProvenancedText } from "@/lib/schema/resume";

/**
 * Shared react-pdf building blocks, parameterized by a per-template theme.
 * Every template's .pdf.tsx composes these rather than re-implementing
 * "section heading" / "bullet list" / "entry header" from scratch — adding
 * a 9th template reuses these too, without modifying them (CLAUDE_FINAL §9).
 */

export interface PdfTheme {
  fontFamily: string;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  // Optional per-template heading treatments — used by PdfSectionHeading.
  sectionHeadingAccentBorder?: boolean; // thin accent rule above the heading (Modern Clean)
  sectionHeadingCentered?: boolean; // centered text (Professional)
  density?: "normal" | "compact"; // smaller sizes/spacing throughout (Compact)
}

function densitySizes(theme: PdfTheme) {
  const compact = theme.density === "compact";
  return {
    headingSize: compact ? 9 : 10,
    headingMarginBottom: compact ? 3 : 6,
    bodySize: compact ? 8.5 : 9.5,
    bulletMarginTop: compact ? 1 : 2,
    entryTitleSize: compact ? 9 : 10,
    metaSize: compact ? 7.5 : 9,
    sectionSpacing: compact ? 8 : 14,
  };
}

export function PdfSectionHeading({ theme, children }: { theme: PdfTheme; children: string }) {
  const { headingSize, headingMarginBottom } = densitySizes(theme);
  const text = (
    <Text
      style={{
        fontSize: headingSize,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: theme.textColor,
        textAlign: theme.sectionHeadingCentered ? "center" : "left",
      }}
    >
      {children}
    </Text>
  );

  if (theme.sectionHeadingAccentBorder) {
    return (
      <View style={{ borderTopWidth: 1.5, borderTopColor: theme.accentColor, paddingTop: 4, marginBottom: headingMarginBottom }}>
        {text}
      </View>
    );
  }

  return <View style={{ marginBottom: headingMarginBottom }}>{text}</View>;
}

export function PdfBullets({ theme, items }: { theme: PdfTheme; items: (ProvenancedText | string)[] }) {
  if (items.length === 0) return null;
  const { bodySize, bulletMarginTop } = densitySizes(theme);
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", marginTop: bulletMarginTop }}>
          <Text style={{ width: 10, fontSize: bodySize - 0.5, color: theme.textColor }}>•</Text>
          <Text style={{ flex: 1, fontSize: bodySize, lineHeight: 1.35, color: theme.textColor }}>
            {typeof item === "string" ? item : item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function PdfEntryHeader({
  theme,
  title,
  meta,
  dateRange,
}: {
  theme: PdfTheme;
  title: string;
  meta?: string;
  dateRange?: string;
}) {
  const { entryTitleSize, metaSize } = densitySizes(theme);
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: entryTitleSize, fontWeight: 700, color: theme.textColor }}>{title}</Text>
        {dateRange ? <Text style={{ fontSize: metaSize, color: theme.mutedColor }}>{dateRange}</Text> : null}
      </View>
      {meta ? <Text style={{ fontSize: metaSize, color: theme.mutedColor, marginTop: 1 }}>{meta}</Text> : null}
    </View>
  );
}

export function PdfContactLine({ theme, parts }: { theme: PdfTheme; parts: (string | undefined)[] }) {
  const line = parts.filter((p): p is string => Boolean(p)).join("   •   ");
  if (!line) return null;
  const { metaSize } = densitySizes(theme);
  return <Text style={{ fontSize: metaSize, color: theme.mutedColor, marginTop: 4 }}>{line}</Text>;
}

export function PdfPlainList({ theme, text }: { theme: PdfTheme; text: string }) {
  if (!text) return null;
  const { bodySize } = densitySizes(theme);
  return <Text style={{ fontSize: bodySize, color: theme.textColor, lineHeight: 1.35 }}>{text}</Text>;
}

export { densitySizes };
