import { z } from "zod";

/**
 * Canonical ResumeData schema (HLD.md §5.1, PRODUCT_SPEC_FINAL.md §6).
 * Single source of truth: templates, editor, PDF, and DOCX all read from
 * this shape (CLAUDE_FINAL.md invariant I1). Optional-tolerant throughout
 * because free-tier regex/heuristic parsing will frequently fail to detect
 * a field — the user fills gaps manually, never the model.
 */

export const bulletOriginSchema = z.enum(["source", "rewritten", "generated"]);
export type BulletOrigin = z.infer<typeof bulletOriginSchema>;

// Per-bullet provenance: a "rewritten" bullet must retain the original text
// it was rewritten from, so the user can always diff and revert (I2, I3).
export const provenancedTextSchema = z
  .object({
    text: z.string(),
    origin: bulletOriginSchema,
    originalText: z.string().optional(),
  })
  .refine((v) => v.origin !== "rewritten" || typeof v.originalText === "string", {
    message: "a 'rewritten' entry must retain originalText",
    path: ["originalText"],
  });
export type ProvenancedText = z.infer<typeof provenancedTextSchema>;

export const linkSchema = z.object({
  label: z.string(),
  url: z.string(),
});
export type ResumeLink = z.infer<typeof linkSchema>;

export const personalInfoSchema = z.object({
  fullName: z.string().optional(),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(linkSchema).default([]),
  photo: z.string().optional(),
});
export type PersonalInfo = z.infer<typeof personalInfoSchema>;

export const experienceEntrySchema = z.object({
  company: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  current: z.boolean().default(false),
  bullets: z.array(provenancedTextSchema).default([]),
});
export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;

export const educationEntrySchema = z.object({
  institution: z.string().optional(),
  degree: z.string().optional(),
  field: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  grade: z.string().optional(),
  highlights: z.array(z.string()).default([]),
});
export type EducationEntry = z.infer<typeof educationEntrySchema>;

export const skillProficiencySchema = z.enum(["knowledge", "hands-on"]);
export type SkillProficiency = z.infer<typeof skillProficiencySchema>;

export const skillEntrySchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  proficiency: skillProficiencySchema.optional(),
  years: z.number().optional(),
});
export type SkillEntry = z.infer<typeof skillEntrySchema>;

export const projectEntrySchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  description: z.string().optional(),
  stack: z.array(z.string()).default([]),
  bullets: z.array(provenancedTextSchema).default([]),
  link: z.string().optional(),
});
export type ProjectEntry = z.infer<typeof projectEntrySchema>;

export const certificationEntrySchema = z.object({
  name: z.string().optional(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  credentialId: z.string().optional(),
});
export type CertificationEntry = z.infer<typeof certificationEntrySchema>;

export const languageEntrySchema = z.object({
  name: z.string(),
  level: z.string().optional(),
});
export type LanguageEntry = z.infer<typeof languageEntrySchema>;

export const publicationEntrySchema = z.object({
  title: z.string().optional(),
  publisher: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
});
export type PublicationEntry = z.infer<typeof publicationEntrySchema>;

export const volunteeringEntrySchema = z.object({
  organization: z.string().optional(),
  role: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  description: z.string().optional(),
});
export type VolunteeringEntry = z.infer<typeof volunteeringEntrySchema>;

export const customSectionSchema = z.object({
  heading: z.string(),
  items: z.array(z.string()).default([]),
});
export type CustomSection = z.infer<typeof customSectionSchema>;

// Locale drives page size, address format, and phone format defaults —
// never hardcode these elsewhere (CLAUDE_FINAL.md §8).
export const localeSchema = z.enum(["in", "intl"]);
export type Locale = z.infer<typeof localeSchema>;

export const pageSizeSchema = z.enum(["A4", "Letter"]);
export type PageSize = z.infer<typeof pageSizeSchema>;

export const senioritySchema = z.enum([
  "fresher",
  "junior",
  "mid",
  "senior",
  "lead",
  "executive",
]);
export type Seniority = z.infer<typeof senioritySchema>;

export const resumeMetaSchema = z.object({
  targetRole: z.string().optional(),
  targetCompany: z.string().optional(),
  seniority: senioritySchema.optional(),
  locale: localeSchema.default("in"),
  pageSize: pageSizeSchema.default("A4"),
});
export type ResumeMeta = z.infer<typeof resumeMetaSchema>;

export const resumeDataSchema = z.object({
  meta: resumeMetaSchema.default({ locale: "in", pageSize: "A4" }),
  personal: personalInfoSchema.default({ links: [] }),
  summary: provenancedTextSchema.optional(),
  experience: z.array(experienceEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  skills: z.array(skillEntrySchema).default([]),
  projects: z.array(projectEntrySchema).default([]),
  certifications: z.array(certificationEntrySchema).default([]),
  achievements: z.array(z.string()).default([]),
  languages: z.array(languageEntrySchema).default([]),
  publications: z.array(publicationEntrySchema).default([]),
  volunteering: z.array(volunteeringEntrySchema).default([]),
  custom: z.array(customSectionSchema).default([]),
});
export type ResumeData = z.infer<typeof resumeDataSchema>;

export function parseResumeData(input: unknown): ResumeData {
  return resumeDataSchema.parse(input);
}

export function safeParseResumeData(input: unknown) {
  return resumeDataSchema.safeParse(input);
}
