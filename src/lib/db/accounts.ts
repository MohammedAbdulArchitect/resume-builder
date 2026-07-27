import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, credits, faqJobs, purchases, resumes, usageEvents } from "@/lib/db/schema";
import type { Locale } from "@/lib/schema/resume";

export interface SignInProfile {
  providerSub: string;
  email: string;
  displayName?: string | null;
  locale: Locale;
}

export async function getAccountByGoogleSub(googleSub: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.googleSub, googleSub));
  return account ?? null;
}

export async function getAccountById(accountId: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  return account ?? null;
}

// Drizzle/pg wrap the raw Postgres error in layers of DrizzleQueryError /
// AuthError .cause chaining, so the "23505" unique-violation code can sit at
// varying depth depending on the call path — walk the cause chain instead
// of assuming it's on the top-level error.
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth++) {
    if (typeof current === "object" && "code" in current && (current as { code?: unknown }).code === "23505") {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

// Upserts on first sign-in. New accounts get a zero-balance credits row in
// the same transaction so entitlement checks never hit a missing row.
//
// Race-safe under concurrent sign-ins for the same brand-new google_sub
// (e.g. a double-click, two tabs, or two parallel test workers): the fast
// path below is a plain select-then-branch, which has a check-then-insert
// race window. Rather than closing it with a heavier lock, we let the
// unique constraint on accounts.google_sub be the real arbiter — if two
// inserts race, the loser's insert fails with 23505 and falls back to
// updating the winner's row instead of propagating the error.
export async function upsertAccountOnSignIn(profile: SignInProfile) {
  const [existing] = await db.select().from(accounts).where(eq(accounts.googleSub, profile.providerSub));
  if (existing) {
    const [updated] = await db
      .update(accounts)
      .set({
        email: profile.email,
        displayName: profile.displayName ?? existing.displayName,
        lastSeenAt: new Date(),
      })
      .where(eq(accounts.id, existing.id))
      .returning();
    return updated;
  }

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(accounts)
        .values({
          googleSub: profile.providerSub,
          email: profile.email,
          displayName: profile.displayName ?? null,
          locale: profile.locale,
        })
        .returning();

      await tx.insert(credits).values({
        accountId: created.id,
        tailoredResumeCredits: 0,
        faqPackCredits: 0,
      });

      return created;
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const [winner] = await db.select().from(accounts).where(eq(accounts.googleSub, profile.providerSub));
    if (!winner) throw error;

    const [updated] = await db
      .update(accounts)
      .set({ email: profile.email, lastSeenAt: new Date() })
      .where(eq(accounts.id, winner.id))
      .returning();
    return updated;
  }
}

// Ordered deletes (not ON DELETE CASCADE) so the deletion path stays
// explicit and auditable. Self-referencing source_resume_id pointers are
// cleared before the resumes themselves are removed.
export async function deleteAccount(accountId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const ownedResumes = await tx
      .select({ id: resumes.id })
      .from(resumes)
      .where(eq(resumes.accountId, accountId));
    const resumeIds = ownedResumes.map((r) => r.id);

    if (resumeIds.length > 0) {
      await tx.delete(faqJobs).where(inArray(faqJobs.resumeId, resumeIds));
      await tx
        .update(resumes)
        .set({ sourceResumeId: null })
        .where(inArray(resumes.sourceResumeId, resumeIds));
    }
    await tx.delete(usageEvents).where(eq(usageEvents.accountId, accountId));
    await tx.delete(purchases).where(eq(purchases.accountId, accountId));
    await tx.delete(credits).where(eq(credits.accountId, accountId));
    await tx.delete(resumes).where(eq(resumes.accountId, accountId));
    await tx.delete(accounts).where(eq(accounts.id, accountId));
  });
}

export async function deleteResume(accountId: string, resumeId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.accountId, accountId)));
    if (!owned) return;

    await tx.update(resumes).set({ sourceResumeId: null }).where(eq(resumes.sourceResumeId, resumeId));
    await tx.delete(faqJobs).where(eq(faqJobs.resumeId, resumeId));
    await tx.delete(resumes).where(eq(resumes.id, resumeId));
  });
}
