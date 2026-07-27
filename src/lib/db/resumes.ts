import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resumes } from "@/lib/db/schema";
import { decryptResumeData, encryptResumeData } from "@/lib/db/encryption";
import type { ResumeData } from "@/lib/schema/resume";

export interface CreateResumeInput {
  accountId: string;
  title: string;
  data: ResumeData;
}

export async function createResume({ accountId, title, data }: CreateResumeInput): Promise<{ id: string }> {
  const [row] = await db
    .insert(resumes)
    .values({
      accountId,
      title,
      resumeDataEncrypted: encryptResumeData(data),
    })
    .returning({ id: resumes.id });
  return row;
}

export interface OwnedResume {
  id: string;
  title: string | null;
  data: ResumeData;
}

export async function getOwnedResume(accountId: string, resumeId: string): Promise<OwnedResume | null> {
  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.accountId, accountId)));

  if (!row || !row.resumeDataEncrypted) return null;

  return {
    id: row.id,
    title: row.title,
    data: decryptResumeData(row.resumeDataEncrypted),
  };
}

// Returns false when the resume doesn't exist or isn't owned by this account.
export async function updateResumeData(
  accountId: string,
  resumeId: string,
  data: ResumeData,
): Promise<boolean> {
  const result = await db
    .update(resumes)
    .set({ resumeDataEncrypted: encryptResumeData(data), updatedAt: new Date() })
    .where(and(eq(resumes.id, resumeId), eq(resumes.accountId, accountId)))
    .returning({ id: resumes.id });
  return result.length > 0;
}
