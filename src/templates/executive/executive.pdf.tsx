import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { TemplateProps } from "@/templates/types";
import { FONT_FAMILIES, registerPdfFonts } from "@/lib/export/pdf/fonts";
import { PdfContactLine, type PdfTheme } from "@/lib/export/pdf/blocks";
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

const theme: PdfTheme = {
  fontFamily: FONT_FAMILIES.lato,
  accentColor: "#1e3a8a",
  textColor: "#111827",
  mutedColor: "#4b5563",
};

// Summary + Achievements promoted directly under the header — see index.tsx.
export function ExecutivePdf({ data, locale }: TemplateProps) {
  const pageSize = getLocaleProfile(locale).pageSize === "A4" ? "A4" : "LETTER";
  const { personal } = data;

  return (
    <Document>
      <Page size={pageSize} style={{ padding: 44, fontFamily: theme.fontFamily, color: theme.textColor, fontSize: 10 }}>
        <View style={{ marginBottom: 20, borderBottomWidth: 3, borderBottomColor: theme.accentColor, paddingBottom: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: 700 }}>{personal.fullName ?? "Your Name"}</Text>
          {personal.headline ? (
            <Text style={{ fontSize: 12, fontWeight: 700, color: theme.mutedColor, marginTop: 2 }}>{personal.headline}</Text>
          ) : null}
          <PdfContactLine theme={theme} parts={[personal.location, personal.email, personal.phone]} />
          {personal.links.length > 0 ? (
            <Text style={{ fontSize: 9, color: theme.mutedColor, marginTop: 2 }}>
              {personal.links.map((l) => l.url).join("   •   ")}
            </Text>
          ) : null}
        </View>

        <PdfSummarySection theme={theme} data={data} />
        <PdfAchievementsSection theme={theme} data={data} />
        <PdfExperienceSection theme={theme} data={data} />
        <PdfEducationSection theme={theme} data={data} />
        <PdfProjectsSection theme={theme} data={data} />
        <PdfSkillsSection theme={theme} data={data} />
        <PdfCertificationsSection theme={theme} data={data} />
        <PdfLanguagesSection theme={theme} data={data} />
      </Page>
    </Document>
  );
}
