import { randomUUID } from "node:crypto";
import {
  resumeDataSchema,
  type CertificationEntry,
  type EducationEntry,
  type ExperienceEntry,
  type LanguageEntry,
  type Locale,
  type ProjectEntry,
  type ProvenancedText,
  type ResumeLink,
  type SkillEntry,
} from "@/lib/schema/resume";
import type { ParseResult, UnassignedBlock } from "@/lib/parsers/types";

/**
 * Heuristic, regex-only resume parser (CLAUDE_FINAL.md §5). No ML, no API
 * calls, deliberately simple and imperfect — the user fixes the rest by
 * hand in the review form. This is the entire free-tier value prop.
 */

type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "achievements"
  | "languages";

const SECTION_PATTERNS: Record<SectionKey, RegExp> = {
  summary: /^(summary|objective|profile|about)\b/i,
  experience: /^(experience|work history|employment)\b/i,
  education: /^(education|qualifications|degree)\b/i,
  skills: /^(skills|technical|competencies)\b/i,
  projects: /^(projects|personal projects)\b/i,
  certifications: /^(certifications|licenses)\b/i,
  achievements: /^(achievements|awards|honors|honours)\b/i,
  languages: /^languages\b/i,
};

const MAX_HEADING_LINE_LENGTH = 40;
const BULLET_LINE = /^\s*[-•*●▪]\s*(.*)$/;

const DATE_TOKEN = "(?:[A-Za-z]{3,9}\\.?\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4}(?:-\\d{2})?)";
const DATE_RANGE_ANYWHERE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:–|—|-|to)\\s*(${DATE_TOKEN}|present|current)`,
  "i",
);

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\-\s()]{7,}\d)/;
const URL_MATCH_RE = /(https?:\/\/[^\s,]+|(?:linkedin|github)\.com\/[^\s,]+)/gi;
const URL_TEST_RE = /https?:\/\/|(?:linkedin|github)\.com/i;
const LOCATION_LINE_RE = /^[A-Za-z][A-Za-z\s]+,\s*[A-Za-z][A-Za-z\s]+(?:,\s*[A-Za-z][A-Za-z\s]+)?$/;

function isHeadingLine(line: string): SectionKey | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > MAX_HEADING_LINE_LENGTH) return null;
  for (const key of Object.keys(SECTION_PATTERNS) as SectionKey[]) {
    if (SECTION_PATTERNS[key].test(trimmed)) return key;
  }
  return null;
}

interface RawSection {
  key: SectionKey;
  lines: string[];
}

function splitIntoSections(lines: string[]): { header: string[]; sections: RawSection[] } {
  const sections: RawSection[] = [];
  const header: string[] = [];
  let current: RawSection | null = null;

  for (const line of lines) {
    const heading = isHeadingLine(line);
    if (heading) {
      current = { key: heading, lines: [] };
      sections.push(current);
      continue;
    }
    if (current) {
      current.lines.push(line);
    } else {
      header.push(line);
    }
  }

  return { header, sections };
}

interface PersonalInfoResult {
  fullName?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  links: ResumeLink[];
  leftover: string;
}

function extractLinks(text: string): ResumeLink[] {
  const links: ResumeLink[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(URL_MATCH_RE)) {
    const raw = match[0];
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const label = /linkedin\.com/i.test(url) ? "LinkedIn" : /github\.com/i.test(url) ? "GitHub" : "Link";
    links.push({ label, url });
  }
  return links;
}

function extractPersonalInfo(headerLines: string[], wholeText: string): PersonalInfoResult {
  const email = wholeText.match(EMAIL_RE)?.[0];
  const phone = wholeText.match(PHONE_RE)?.[0]?.trim();
  const links = extractLinks(wholeText);

  const nonEmpty = headerLines.map((l) => l.trim()).filter(Boolean);
  const consumed = new Set<number>();

  let fullName: string | undefined;
  let headline: string | undefined;
  let location: string | undefined;

  for (let i = 0; i < nonEmpty.length; i++) {
    const line = nonEmpty[i];
    if (fullName) break;
    if (line.includes("@") || PHONE_RE.test(line) || URL_TEST_RE.test(line)) continue;
    if (line.length > 60) continue;
    fullName = line;
    consumed.add(i);
  }

  if (fullName) {
    for (let i = 0; i < nonEmpty.length; i++) {
      if (consumed.has(i)) continue;
      const line = nonEmpty[i];
      if (line.includes("@") || PHONE_RE.test(line) || URL_TEST_RE.test(line)) continue;
      if (line.length > 80) continue;
      headline = line;
      consumed.add(i);
      break;
    }
  }

  for (let i = 0; i < nonEmpty.length; i++) {
    if (consumed.has(i)) continue;
    const line = nonEmpty[i];
    if (LOCATION_LINE_RE.test(line) && !/\d/.test(line)) {
      location = line;
      consumed.add(i);
      break;
    }
  }

  const leftoverLines = nonEmpty.filter((line, i) => {
    if (consumed.has(i)) return false;
    if (line.includes("@") || PHONE_RE.test(line) || URL_TEST_RE.test(line)) return false;
    return true;
  });

  return {
    fullName,
    headline,
    email,
    phone,
    location,
    links,
    leftover: leftoverLines.join("\n"),
  };
}

interface RawEntry {
  headerLines: string[];
  bullets: string[];
}

function splitEntries(lines: string[]): RawEntry[] {
  const entries: RawEntry[] = [];
  let current: RawEntry | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const bulletMatch = BULLET_LINE.exec(trimmed);
    if (bulletMatch) {
      if (!current) {
        current = { headerLines: [], bullets: [] };
        entries.push(current);
      }
      current.bullets.push(bulletMatch[1].trim());
      continue;
    }

    if (current && current.bullets.length > 0) {
      current = { headerLines: [], bullets: [] };
      entries.push(current);
    } else if (!current) {
      current = { headerLines: [], bullets: [] };
      entries.push(current);
    }
    current.headerLines.push(trimmed);
  }

  return entries;
}

function extractDateRange(headerLines: string[]): { start?: string; end?: string; current: boolean; remaining: string[] } {
  for (let i = 0; i < headerLines.length; i++) {
    const match = DATE_RANGE_ANYWHERE.exec(headerLines[i]);
    if (!match) continue;
    const start = match[1];
    const endRaw = match[2];
    const isCurrent = /present|current/i.test(endRaw);
    const remaining = [...headerLines];
    const withoutMatch = headerLines[i].replace(match[0], "").trim();
    if (withoutMatch) {
      remaining[i] = withoutMatch;
    } else {
      remaining.splice(i, 1);
    }
    return { start, end: isCurrent ? "" : endRaw, current: isCurrent, remaining };
  }
  return { current: false, remaining: headerLines };
}

function toBullets(lines: string[]): ProvenancedText[] {
  return lines.map((text) => ({ text, origin: "source" as const }));
}

function parseExperienceEntries(lines: string[]): ExperienceEntry[] {
  return splitEntries(lines).map((entry) => {
    const { start, end, current, remaining } = extractDateRange(entry.headerLines);
    const headerText = remaining.join(", ");
    const [titleCompany, ...locationParts] = headerText.split(/\s*—\s*/);
    const location = locationParts.length > 0 ? locationParts.join(" — ") : undefined;
    const [title, company] = titleCompany.split(/\s*,\s*/, 2);

    return {
      title: title || undefined,
      company: company || undefined,
      location,
      start,
      end,
      current,
      bullets: toBullets(entry.bullets),
    };
  });
}

function parseEducationEntries(lines: string[]): EducationEntry[] {
  return splitEntries(lines).map((entry) => {
    const { start, end, remaining } = extractDateRange(entry.headerLines);
    const headerText = remaining.join(", ");
    const [degreeField, ...institutionParts] = headerText.split(/\s*—\s*/);
    const institution = institutionParts.length > 0 ? institutionParts.join(" — ") : undefined;
    const [degree, field] = degreeField.split(/\s*,\s*/, 2);

    return {
      degree: degree || undefined,
      field: field || undefined,
      institution,
      start,
      end,
      highlights: entry.bullets,
    };
  });
}

function parseProjectEntries(lines: string[]): ProjectEntry[] {
  return splitEntries(lines).map((entry) => {
    let stack: string[] = [];
    const remainingHeaderLines: string[] = [];

    for (const line of entry.headerLines) {
      const stackMatch = /^stack:\s*(.*)$/i.exec(line);
      if (stackMatch) {
        stack = stackMatch[1].split(/\s*,\s*/).filter(Boolean);
      } else {
        remainingHeaderLines.push(line);
      }
    }

    const headerText = remainingHeaderLines.join(", ");
    const [name, ...roleParts] = headerText.split(/\s*—\s*/);
    const role = roleParts.length > 0 ? roleParts.join(" — ") : undefined;

    return {
      name: name || undefined,
      role,
      stack,
      bullets: toBullets(entry.bullets),
    };
  });
}

function parseSkillsList(lines: string[]): SkillEntry[] {
  return lines
    .join(",")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

const CERT_RE = /^(.*?)\s*[—-]\s*(.*?)\s*\((.*?)\)\s*$/;

function parseCertificationLines(lines: string[]): CertificationEntry[] {
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const match = CERT_RE.exec(line);
      if (match) {
        return { name: match[1], issuer: match[2], date: match[3] };
      }
      return { name: line };
    });
}

function parseAchievementLines(lines: string[]): string[] {
  return lines
    .map((l) => BULLET_LINE.exec(l.trim())?.[1]?.trim() ?? l.trim())
    .filter(Boolean);
}

const LANG_RE = /^(.*?)\s*\((.*?)\)$/;

function parseLanguageLines(lines: string[]): LanguageEntry[] {
  return lines
    .join(",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const match = LANG_RE.exec(token);
      if (match) return { name: match[1].trim(), level: match[2].trim() };
      return { name: token };
    });
}

export function parseResumeText(text: string, locale: Locale): ParseResult {
  const lines = text.split(/\r?\n/);
  const { header, sections } = splitIntoSections(lines);
  const personal = extractPersonalInfo(header, text);

  const unassigned: UnassignedBlock[] = [];
  if (personal.leftover.trim()) {
    unassigned.push({ id: randomUUID(), text: personal.leftover.trim() });
  }

  let summary: ProvenancedText | undefined;
  const experience: ExperienceEntry[] = [];
  const education: EducationEntry[] = [];
  const skills: SkillEntry[] = [];
  const projects: ProjectEntry[] = [];
  const certifications: CertificationEntry[] = [];
  const achievements: string[] = [];
  const languages: LanguageEntry[] = [];

  for (const section of sections) {
    switch (section.key) {
      case "summary": {
        const joined = section.lines.map((l) => l.trim()).filter(Boolean).join(" ");
        if (joined) summary = { text: joined, origin: "source" };
        break;
      }
      case "experience":
        experience.push(...parseExperienceEntries(section.lines));
        break;
      case "education":
        education.push(...parseEducationEntries(section.lines));
        break;
      case "skills":
        skills.push(...parseSkillsList(section.lines));
        break;
      case "projects":
        projects.push(...parseProjectEntries(section.lines));
        break;
      case "certifications":
        certifications.push(...parseCertificationLines(section.lines));
        break;
      case "achievements":
        achievements.push(...parseAchievementLines(section.lines));
        break;
      case "languages":
        languages.push(...parseLanguageLines(section.lines));
        break;
    }
  }

  const draft = {
    meta: { locale },
    personal: {
      fullName: personal.fullName,
      headline: personal.headline,
      email: personal.email,
      phone: personal.phone,
      location: personal.location,
      links: personal.links,
    },
    summary,
    experience,
    education,
    skills,
    projects,
    certifications,
    achievements,
    languages,
  };

  return { data: resumeDataSchema.parse(draft), unassigned };
}
