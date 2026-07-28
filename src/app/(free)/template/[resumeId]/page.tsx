import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth/require-account";
import { getOwnedResume } from "@/lib/db/resumes";
import { TemplateGallery } from "@/app/(free)/template/[resumeId]/template-gallery";

interface TemplateGalleryPageProps {
  params: Promise<{ resumeId: string }>;
}

export default async function TemplateGalleryPage({ params }: TemplateGalleryPageProps) {
  const { accountId } = await requireAccount();
  const { resumeId } = await params;

  const resume = await getOwnedResume(accountId, resumeId);
  if (!resume) notFound();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8">
      <TemplateGallery resumeId={resume.id} data={resume.data} />
    </main>
  );
}
