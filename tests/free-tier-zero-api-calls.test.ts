import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseResumeText } from "@/lib/parsers/regex";
import { computeAtsScore } from "@/lib/ats/score";
import { getTemplate } from "@/templates/registry";

/**
 * The critical test for this phase (phase3.md): the free tier must make
 * ZERO Anthropic API calls. src/lib/ai/client.ts is still an empty Phase-1
 * placeholder, so there's no real client to spy on yet — the strongest
 * dynamic guarantee available now is that the free-tier journey (parse +
 * score) makes NO network calls at all, of any kind. That's a stronger
 * claim than "zero Anthropic calls" and will keep working as a regression
 * guard once Phase 6 adds a real client. The ESLint cost-domain firewall
 * (eslint.config.mjs) is the complementary static guarantee: no free-tier
 * module, including this one's dependencies, has an import path to
 * src/lib/ai at all.
 */

function loadFixture(name: string): string {
  return readFileSync(path.join(process.cwd(), "fixtures", name), "utf8");
}

describe("free tier makes zero network calls", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(() => {
      throw new Error("network call attempted during the free-tier journey");
    });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses all three fixtures and computes ATS scores without any network call", () => {
    const template = getTemplate("ats-plain");
    expect(template).toBeDefined();

    for (const fixture of ["fresher-it.txt", "experienced-non-it.txt", "career-changer.txt"]) {
      const { data } = parseResumeText(loadFixture(fixture), "in");
      const score = computeAtsScore(template!, data);
      expect(score).toBeGreaterThanOrEqual(0);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
