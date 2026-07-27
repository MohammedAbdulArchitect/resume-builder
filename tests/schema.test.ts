import { describe, expect, it } from "vitest";
import { resumeDataSchema, safeParseResumeData } from "@/lib/schema/resume";
import fresherIt from "@fixtures/fresher-it.json";
import experiencedNonIt from "@fixtures/experienced-non-it.json";
import careerChanger from "@fixtures/career-changer.json";

describe("resumeDataSchema", () => {
  it.each([
    ["fresher-it", fresherIt],
    ["experienced-non-it", experiencedNonIt],
    ["career-changer", careerChanger],
  ])("validates the %s fixture", (_name, fixture) => {
    expect(() => resumeDataSchema.parse(fixture)).not.toThrow();
  });

  it("rejects a malformed object", () => {
    const malformed = {
      personal: { fullName: "Bad Data" },
      experience: [
        {
          company: "Acme",
          bullets: [
            // origin 'rewritten' without originalText must fail validation
            { text: "Did a thing", origin: "rewritten" },
          ],
        },
      ],
    };

    const result = safeParseResumeData(malformed);
    expect(result.success).toBe(false);
  });
});
