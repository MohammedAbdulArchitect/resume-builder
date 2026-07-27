import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth/require-account";
import { getOwnedResume } from "@/lib/db/resumes";
import { ReviewForm } from "@/app/(free)/review/[resumeId]/review-form";

interface ReviewPageProps {
  params: Promise<{ resumeId: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { accountId } = await requireAccount();
  const { resumeId } = await params;

  const resume = await getOwnedResume(accountId, resumeId);
  if (!resume) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8">
      <ReviewForm resumeId={resume.id} initialData={resume.data} />
    </main>
  );
}
