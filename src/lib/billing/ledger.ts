import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { credits } from "@/lib/db/schema";

export type DebitResult = { ok: true } | { ok: false; reason: "insufficient_credit" };

// A single conditional UPDATE...RETURNING is already atomic under Postgres's
// row-level locking: zero rows back means the WHERE guard failed, so the
// balance never goes negative and no separate SELECT ... FOR UPDATE is needed.
export async function debitTailoredResumeCredit(accountId: string): Promise<DebitResult> {
  const [row] = await db
    .update(credits)
    .set({ tailoredResumeCredits: sql`${credits.tailoredResumeCredits} - 1`, updatedAt: new Date() })
    .where(and(eq(credits.accountId, accountId), gt(credits.tailoredResumeCredits, 0)))
    .returning();
  return row ? { ok: true } : { ok: false, reason: "insufficient_credit" };
}

export async function refundTailoredResumeCredit(accountId: string): Promise<void> {
  await db
    .update(credits)
    .set({ tailoredResumeCredits: sql`${credits.tailoredResumeCredits} + 1`, updatedAt: new Date() })
    .where(eq(credits.accountId, accountId));
}

export async function debitFaqPackCredit(accountId: string): Promise<DebitResult> {
  const [row] = await db
    .update(credits)
    .set({ faqPackCredits: sql`${credits.faqPackCredits} - 1`, updatedAt: new Date() })
    .where(and(eq(credits.accountId, accountId), gt(credits.faqPackCredits, 0)))
    .returning();
  return row ? { ok: true } : { ok: false, reason: "insufficient_credit" };
}

export async function refundFaqPackCredit(accountId: string): Promise<void> {
  await db
    .update(credits)
    .set({ faqPackCredits: sql`${credits.faqPackCredits} + 1`, updatedAt: new Date() })
    .where(eq(credits.accountId, accountId));
}
