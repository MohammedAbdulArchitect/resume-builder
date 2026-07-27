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

// Upserts on first sign-in. New accounts get a zero-balance credits row in
// the same transaction so entitlement checks never hit a missing row.
export async function upsertAccountOnSignIn(profile: SignInProfile) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.googleSub, profile.providerSub));

    if (existing) {
      const [updated] = await tx
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
