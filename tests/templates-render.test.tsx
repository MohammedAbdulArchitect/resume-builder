import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { parseResumeData } from "@/lib/schema/resume";
import type { Locale } from "@/lib/schema/resume";
import { templateRegistry } from "@/templates/registry";
import fresherIt from "@fixtures/fresher-it.json";
import experiencedNonIt from "@fixtures/experienced-non-it.json";
import careerChanger from "@fixtures/career-changer.json";

const fixtures = [
  ["fresher-it", fresherIt],
  ["experienced-non-it", experiencedNonIt],
  ["career-changer", careerChanger],
] as const;

const locales: Locale[] = ["in", "intl"];

describe("template previews", () => {
  for (const template of templateRegistry) {
    for (const [fixtureName, fixture] of fixtures) {
      for (const locale of locales) {
        it(`${template.slug} renders ${fixtureName} in locale ${locale} without throwing`, () => {
          const data = parseResumeData(fixture);
          const Template = template.component;
          expect(() => render(<Template data={data} locale={locale} />)).not.toThrow();
        });
      }
    }
  }
});
