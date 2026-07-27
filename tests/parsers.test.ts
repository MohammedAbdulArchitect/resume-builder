import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseResumeText } from "@/lib/parsers/regex";
import { resumeDataSchema } from "@/lib/schema/resume";

function loadFixture(name: string): string {
  return readFileSync(path.join(process.cwd(), "fixtures", name), "utf8");
}

describe("parseResumeText", () => {
  it("parses the fresher-it fixture", () => {
    const { data, unassigned } = parseResumeText(loadFixture("fresher-it.txt"), "in");

    expect(() => resumeDataSchema.parse(data)).not.toThrow();
    expect(data.personal.fullName).toBe("Ananya Sharma");
    expect(data.personal.email).toBe("ananya.sharma@example.com");
    expect(data.experience[0]?.company).toBe("Nimbus Cloud Labs");
    expect(data.experience[0]?.title).toBe("Software Engineering Intern");
    expect(data.experience[0]?.bullets.length).toBeGreaterThan(0);
    expect(data.education[0]?.institution).toBe("Pune Institute of Technology");
    expect(data.skills.map((s) => s.name)).toContain("JavaScript");
    expect(data.projects[0]?.stack).toContain("React");
    expect(data.certifications[0]?.issuer).toBe("Amazon Web Services");
    expect(data.languages.length).toBe(2);
    expect(unassigned).toEqual([]);
  });

  it("parses the experienced-non-it fixture with two experience entries", () => {
    const { data } = parseResumeText(loadFixture("experienced-non-it.txt"), "intl");

    expect(data.personal.fullName).toBe("Marcus Webb");
    expect(data.experience).toHaveLength(2);
    expect(data.experience[0]?.company).toBe("Redwood Retail Group");
    expect(data.experience[0]?.current).toBe(true);
    expect(data.experience[0]?.end).toBe("");
    expect(data.experience[1]?.company).toBe("Delmar Logistics");
    expect(data.experience[1]?.start).toBe("Apr 2015");
    expect(data.experience[1]?.end).toBe("Jan 2019");
  });

  it("parses the career-changer fixture with two education entries", () => {
    const { data } = parseResumeText(loadFixture("career-changer.txt"), "in");

    expect(data.personal.fullName).toBe("Priya Nair");
    expect(data.education).toHaveLength(2);
    expect(data.education[0]?.institution).toBe("Bengaluru Data Analytics Academy");
    expect(data.education[1]?.institution).toBe("Christ University");
    expect(data.projects[0]?.name).toBe("School Exam Performance Dashboard");
  });

  it("puts unrecognized preamble text into the unassigned bucket", () => {
    const text = [
      "Some Name",
      "A random line that is not a name, email, phone, url, or location",
      "Another stray line of context nobody asked for",
      "",
      "Skills",
      "Cooking, Gardening",
    ].join("\n");

    const { data, unassigned } = parseResumeText(text, "in");

    expect(data.personal.fullName).toBe("Some Name");
    expect(unassigned.length).toBeGreaterThan(0);
    expect(unassigned[0].text).toContain("stray line");
  });

  it("never throws on malformed or empty input", () => {
    expect(() => parseResumeText("", "in")).not.toThrow();
    expect(() => parseResumeText("\n\n\n", "in")).not.toThrow();
    expect(() => parseResumeText("​​​ garbled \0 bytes �", "in")).not.toThrow();

    const { data } = parseResumeText("", "in");
    expect(() => resumeDataSchema.parse(data)).not.toThrow();
  });
});
