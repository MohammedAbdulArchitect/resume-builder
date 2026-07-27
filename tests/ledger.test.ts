import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { accounts, credits } from "@/lib/db/schema";
import {
  debitFaqPackCredit,
  debitTailoredResumeCredit,
  refundFaqPackCredit,
  refundTailoredResumeCredit,
} from "@/lib/billing/ledger";
import {
  canGenerateFAQPack,
  canTailorResume,
  creditsExpireAt,
  faqPacksRemaining,
  tailoredResumesRemaining,
} from "@/lib/billing/entitlements";

// Integration tests against the real dev Postgres (tests/setup.ts loads
// .env.local) — proves real transactional correctness rather than a mock.
// Every test creates its own disposable account+credits row and cleans up.

async function createTestAccount(overrides: {
  tailoredResumeCredits?: number;
  faqPackCredits?: number;
  expiresAt?: Date | null;
}) {
  const [account] = await db
    .insert(accounts)
    .values({
      googleSub: `test-ledger-${randomUUID()}`,
      email: "ledger-test@example.com",
      locale: "in",
    })
    .returning();

  await db.insert(credits).values({
    accountId: account.id,
    tailoredResumeCredits: overrides.tailoredResumeCredits ?? 0,
    faqPackCredits: overrides.faqPackCredits ?? 0,
    expiresAt: overrides.expiresAt ?? null,
  });

  return account.id;
}

async function cleanupAccount(accountId: string) {
  await db.delete(credits).where(eq(credits.accountId, accountId));
  await db.delete(accounts).where(eq(accounts.id, accountId));
}

let accountId: string;

describe("credit ledger", () => {
  afterEach(async () => {
    if (accountId) await cleanupAccount(accountId);
  });

  it("never goes negative — debit fails at zero balance", async () => {
    accountId = await createTestAccount({ tailoredResumeCredits: 0 });

    const result = await debitTailoredResumeCredit(accountId);

    expect(result).toEqual({ ok: false, reason: "insufficient_credit" });
    expect(await tailoredResumesRemaining(accountId)).toBe(0);
  });

  it("debits exactly one credit on success", async () => {
    accountId = await createTestAccount({ tailoredResumeCredits: 3 });

    const result = await debitTailoredResumeCredit(accountId);

    expect(result).toEqual({ ok: true });
    expect(await tailoredResumesRemaining(accountId)).toBe(2);
  });

  it("refund restores the balance", async () => {
    accountId = await createTestAccount({ tailoredResumeCredits: 1 });

    await debitTailoredResumeCredit(accountId);
    expect(await tailoredResumesRemaining(accountId)).toBe(0);

    await refundTailoredResumeCredit(accountId);
    expect(await tailoredResumesRemaining(accountId)).toBe(1);
  });

  it("faq pack credits debit/refund independently of tailored resume credits", async () => {
    accountId = await createTestAccount({ tailoredResumeCredits: 1, faqPackCredits: 1 });

    const faqDebit = await debitFaqPackCredit(accountId);
    expect(faqDebit).toEqual({ ok: true });
    expect(await faqPacksRemaining(accountId)).toBe(0);
    expect(await tailoredResumesRemaining(accountId)).toBe(1);

    const faqDebitAgain = await debitFaqPackCredit(accountId);
    expect(faqDebitAgain).toEqual({ ok: false, reason: "insufficient_credit" });

    await refundFaqPackCredit(accountId);
    expect(await faqPacksRemaining(accountId)).toBe(1);
  });
});

describe("entitlement gates", () => {
  afterEach(async () => {
    if (accountId) await cleanupAccount(accountId);
  });

  it("reject a fresh zero-credit account", async () => {
    accountId = await createTestAccount({});

    expect(await canTailorResume(accountId)).toBe(false);
    expect(await canGenerateFAQPack(accountId)).toBe(false);
  });

  it("allow an account with positive, unexpired credits", async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    accountId = await createTestAccount({
      tailoredResumeCredits: 1,
      faqPackCredits: 1,
      expiresAt: future,
    });

    expect(await canTailorResume(accountId)).toBe(true);
    expect(await canGenerateFAQPack(accountId)).toBe(true);
    expect(await creditsExpireAt(accountId)).toEqual(future);
  });

  it("reject expired credits even when the raw counters are positive", async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    accountId = await createTestAccount({
      tailoredResumeCredits: 5,
      faqPackCredits: 5,
      expiresAt: past,
    });

    expect(await canTailorResume(accountId)).toBe(false);
    expect(await canGenerateFAQPack(accountId)).toBe(false);
    expect(await tailoredResumesRemaining(accountId)).toBe(0);
    expect(await faqPacksRemaining(accountId)).toBe(0);
  });
});
