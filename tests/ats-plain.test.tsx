import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { parseResumeData } from "@/lib/schema/resume";
import { AtsPlainTemplate } from "@/templates/ats-plain";
import fresherIt from "@fixtures/fresher-it.json";
import experiencedNonIt from "@fixtures/experienced-non-it.json";
import careerChanger from "@fixtures/career-changer.json";

describe("AtsPlainTemplate", () => {
  it.each([
    ["fresher-it", fresherIt],
    ["experienced-non-it", experiencedNonIt],
    ["career-changer", careerChanger],
  ])("renders the %s fixture without throwing", (_name, fixture) => {
    const data = parseResumeData(fixture);
    expect(() => render(<AtsPlainTemplate data={data} locale={data.meta.locale} />)).not.toThrow();
  });
});
