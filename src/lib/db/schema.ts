import {
  boolean,
  customType,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Full Postgres schema (HLD.md §5.2). `resume_data_encrypted` holds the
 * app-layer AES-256-GCM ciphertext of a ResumeData JSON document — the
 * database never sees plaintext resume content (HLD.md §5.3).
 */

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  locale: text("locale").notNull(), // 'in' | 'intl'
  isPromo: boolean("is_promo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  title: text("title"),
  resumeDataEncrypted: bytea("resume_data_encrypted"),
  isTailored: boolean("is_tailored").notNull().default(false),
  sourceResumeId: uuid("source_resume_id").references((): AnyPgColumn => resumes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const credits = pgTable("credits", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accounts.id),
  tailoredResumeCredits: integer("tailored_resume_credits").notNull().default(0),
  faqPackCredits: integer("faq_pack_credits").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const faqJobs = pgTable("faq_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  resumeId: uuid("resume_id")
    .notNull()
    .references(() => resumes.id),
  batchId: text("batch_id"), // Anthropic batch id
  status: text("status").notNull().default("queued"), // queued | processing | ready | failed
  resultHtml: text("result_html"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  operation: text("operation").notNull(), // 'analyze' | 'rewrite' | 'summary' | 'faq'
  model: text("model").notNull(), // 'haiku' | 'sonnet'
  mode: text("mode").notNull(), // 'realtime' | 'batch'
  tokensIn: integer("tokens_in").notNull(),
  tokensOut: integer("tokens_out").notNull(),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  provider: text("provider").notNull(), // 'razorpay' | 'stripe'
  providerRef: text("provider_ref").notNull().unique(), // idempotency key
  product: text("product").notNull(), // 'base' | 'topup'
  amountMinor: integer("amount_minor").notNull(), // paise or cents
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
