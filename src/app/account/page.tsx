import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth/require-account";
import { signOut } from "@/lib/auth";
import { deleteAccount, deleteResume } from "@/lib/db/accounts";
import { db } from "@/lib/db/client";
import { resumes } from "@/lib/db/schema";
import { tailoredResumesRemaining, faqPacksRemaining, creditsExpireAt } from "@/lib/billing/entitlements";
import { Button } from "@/components/ui/button";

async function handleDeleteAccount() {
  "use server";
  const { accountId } = await requireAccount();
  await deleteAccount(accountId);
  await signOut({ redirectTo: "/" });
}

async function handleDeleteResume(formData: FormData) {
  "use server";
  const { accountId } = await requireAccount();
  const resumeId = formData.get("resumeId");
  if (typeof resumeId === "string") {
    await deleteResume(accountId, resumeId);
  }
  revalidatePath("/account");
}

export default async function AccountPage() {
  const { accountId, email } = await requireAccount();

  const [tailoredRemaining, faqRemaining, expiresAt, ownedResumes] = await Promise.all([
    tailoredResumesRemaining(accountId),
    faqPacksRemaining(accountId),
    creditsExpireAt(accountId),
    db.select().from(resumes).where(eq(resumes.accountId, accountId)),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <section>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-neutral-600">{email}</p>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Credits</h2>
        <dl className="mt-2 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-neutral-500">Tailored resumes</dt>
            <dd className="text-lg font-semibold">{tailoredRemaining}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">FAQ packs</dt>
            <dd className="text-lg font-semibold">{faqRemaining}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-neutral-500">
          {expiresAt ? `Expires ${expiresAt.toLocaleDateString()}` : "No credits purchased yet"}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Your resumes</h2>
        {ownedResumes.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">
            No resumes yet — upload one to get started (Phase 3).
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {ownedResumes.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span>{r.title ?? "Untitled resume"}</span>
                <form action={handleDeleteResume}>
                  <input type="hidden" name="resumeId" value={r.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t pt-6">
        <form action={handleDeleteAccount}>
          <Button type="submit" variant="destructive">
            Delete account
          </Button>
        </form>
        <p className="mt-1 text-xs text-neutral-500">Deletes your account and all resumes immediately.</p>
      </section>
    </main>
  );
}
