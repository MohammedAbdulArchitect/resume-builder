import { describe, expect, it } from "vitest";
import { computeAtsScore, contactAsPlainText, hasConsistentDateFormat } from "@/lib/ats/score";
import { resumeDataSchema } from "@/lib/schema/resume";
import type { TemplateDefinition } from "@/templates/types";

function noop() {
  return null;
}

function template(overrides: Partial<TemplateDefinition> = {}): TemplateDefinition {
  return {
    slug: "test",
    name: "Test",
    description: "",
    component: noop as never,
    isSingleColumn: true,
    hasTableContent: false,
    hasStandardHeadings: true,
    fontInApprovedList: true,
    ...overrides,
  };
}

const baseData = resumeDataSchema.parse({});

describe("computeAtsScore", () => {
  it("scores 100 when every criterion passes", () => {
    expect(computeAtsScore(template(), baseData)).toBe(100);
  });

  it("deducts 25 for a multi-column template", () => {
    expect(computeAtsScore(template({ isSingleColumn: false }), baseData)).toBe(75);
  });

  it("deducts 15 for table content", () => {
    expect(computeAtsScore(template({ hasTableContent: true }), baseData)).toBe(85);
  });

  it("deducts 20 for non-standard headings", () => {
    expect(computeAtsScore(template({ hasStandardHeadings: false }), baseData)).toBe(80);
  });

  it("deducts 10 for a font outside the approved list", () => {
    expect(computeAtsScore(template({ fontInApprovedList: false }), baseData)).toBe(90);
  });

  it("deducts 15 for inconsistent date formats", () => {
    const data = resumeDataSchema.parse({
      experience: [
        { start: "Jun 2020", end: "Aug 2020", bullets: [] },
        { start: "2021-01", end: "2021-06", bullets: [] },
      ],
    });
    expect(computeAtsScore(template(), data)).toBe(85);
  });

  it("deducts 15 for markup leaking into contact fields", () => {
    const data = resumeDataSchema.parse({ personal: { email: "<script>@example.com" } });
    expect(computeAtsScore(template(), data)).toBe(85);
  });

  it("never exceeds 100", () => {
    expect(computeAtsScore(template(), baseData)).toBeLessThanOrEqual(100);
  });
});

describe("hasConsistentDateFormat", () => {
  it("is vacuously true with no dates", () => {
    expect(hasConsistentDateFormat(baseData)).toBe(true);
  });

  it("is true when all dates share one shape", () => {
    const data = resumeDataSchema.parse({
      experience: [{ start: "Jun 2020", end: "Present", bullets: [] }],
      education: [{ start: "Aug 2016", end: "May 2020" }],
    });
    expect(hasConsistentDateFormat(data)).toBe(true);
  });

  it("is false when shapes are mixed", () => {
    const data = resumeDataSchema.parse({
      experience: [{ start: "Jun 2020", end: "2021-06", bullets: [] }],
    });
    expect(hasConsistentDateFormat(data)).toBe(false);
  });
});

describe("contactAsPlainText", () => {
  it("is true for plain contact fields", () => {
    const data = resumeDataSchema.parse({ personal: { email: "a@b.com", phone: "+1 555 0100" } });
    expect(contactAsPlainText(data)).toBe(true);
  });

  it("is false when a contact field contains markup", () => {
    const data = resumeDataSchema.parse({ personal: { location: "<b>Austin</b>" } });
    expect(contactAsPlainText(data)).toBe(false);
  });
});
