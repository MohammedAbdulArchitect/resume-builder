import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { TemplateProps } from "@/templates/types";
import { FONT_FAMILIES, registerPdfFonts } from "@/lib/export/pdf/fonts";
import type { PdfTheme } from "@/lib/export/pdf/blocks";
import {
  PdfAchievementsSection,
  PdfCertificationsSection,
  PdfEducationSection,
  PdfExperienceSection,
  PdfLanguagesSection,
  PdfProjectsSection,
  PdfSkillsSection,
  PdfSummarySection,
} from "@/lib/export/pdf/sections";
import { getLocaleProfile } from "@/lib/locale";

registerPdfFonts();

const ACCENT = "#0f766e";
const mainTheme: PdfTheme = { fontFamily: FONT_FAMILIES.inter, accentColor: ACCENT, textColor: "#111827", mutedColor: "#4b5563" };
const sidebarTheme: PdfTheme = { fontFamily: FONT_FAMILIES.inter, accentColor: ACCENT, textColor: "#134e4a", mutedColor: "#3f6212" };

// The one template flagged with reduced ATS safety (isSingleColumn: false
// in the registry) — a real sidebar layout, not a cosmetic variation.
export function TwoColumnPdf({ data, locale }: TemplateProps) {
  const pageSize = getLocaleProfile(locale).pageSize === "A4" ? "A4" : "LETTER";
  const { personal } = data;

  return (
    <Document>
      <Page size={pageSize} style={{ fontFamily: mainTheme.fontFamily, fontSize: 10 }}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: "34%", backgroundColor: "#f0fdfa", padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 700, color: sidebarTheme.textColor }}>
              {personal.fullName ?? "Your Name"}
            </Text>
            {personal.headline ? (
              <Text style={{ fontSize: 9, color: sidebarTheme.mutedColor, marginTop: 2 }}>{personal.headline}</Text>
            ) : null}
            <View style={{ marginTop: 10 }}>
              {[personal.location, personal.email, personal.phone, ...personal.links.map((l) => l.url)]
                .filter(Boolean)
                .map((line, i) => (
                  <Text key={i} style={{ fontSize: 8, color: sidebarTheme.mutedColor, marginBottom: 2 }}>
                    {line}
                  </Text>
                ))}
            </View>
            <View style={{ marginTop: 14 }}>
              <PdfSkillsSection theme={sidebarTheme} data={data} />
              <PdfLanguagesSection theme={sidebarTheme} data={data} />
              <PdfCertificationsSection theme={sidebarTheme} data={data} />
            </View>
          </View>
          <View style={{ width: "66%", padding: 24 }}>
            <PdfSummarySection theme={mainTheme} data={data} />
            <PdfExperienceSection theme={mainTheme} data={data} />
            <PdfEducationSection theme={mainTheme} data={data} />
            <PdfProjectsSection theme={mainTheme} data={data} />
            <PdfAchievementsSection theme={mainTheme} data={data} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
