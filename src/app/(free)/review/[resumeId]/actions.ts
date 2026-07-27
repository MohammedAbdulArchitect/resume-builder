"use server";

import { requireAccount } from "@/lib/auth/require-account";
import { resumeDataSchema } from "@/lib/schema/resume";
import { updateResumeData } from "@/lib/db/resumes";

export interface SaveResumeResult {
  ok: boolean;
  error?: string;
}

// I3: nothing exports without confirmation — edits are only persisted when
// the user explicitly clicks Save, not autosaved on every keystroke.
export async function saveResumeData(resumeId: string, data: unknown): Promise<SaveResumeResult> {
  const { accountId } = await requireAccount();

  const parsed = resumeDataSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "That resume data isn't valid." };
  }

  const updated = await updateResumeData(accountId, resumeId, parsed.data);
  if (!updated) {
    return { ok: false, error: "Resume not found." };
  }

  return { ok: true };
}
