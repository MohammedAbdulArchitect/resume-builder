import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { credits } from "@/lib/db/schema";

async function getCreditsRow(accountId: string) {
  const [row] = await db.select().from(credits).where(eq(credits.accountId, accountId));
  return row ?? null;
}

function isExpired(expiresAt: Date | null): boolean {
  return expiresAt !== null && expiresAt.getTime() < Date.now();
}

export async function tailoredResumesRemaining(accountId: string): Promise<number> {
  const row = await getCreditsRow(accountId);
  if (!row || isExpired(row.expiresAt)) return 0;
  return row.tailoredResumeCredits;
}

export async function faqPacksRemaining(accountId: string): Promise<number> {
  const row = await getCreditsRow(accountId);
  if (!row || isExpired(row.expiresAt)) return 0;
  return row.faqPackCredits;
}

export async function canTailorResume(accountId: string): Promise<boolean> {
  return (await tailoredResumesRemaining(accountId)) > 0;
}

export async function canGenerateFAQPack(accountId: string): Promise<boolean> {
  return (await faqPacksRemaining(accountId)) > 0;
}

export async function creditsExpireAt(accountId: string): Promise<Date | null> {
  const row = await getCreditsRow(accountId);
  return row?.expiresAt ?? null;
}
