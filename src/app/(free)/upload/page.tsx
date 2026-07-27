import { requireAccount } from "@/lib/auth/require-account";
import { UploadForm } from "@/app/(free)/upload/upload-form";

export default async function UploadPage() {
  await requireAccount();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Upload your resume</h1>
        <p className="mt-1 text-neutral-600">
          PDF, DOCX, or TXT — up to 10MB. Parsed entirely with regex, zero AI calls.
        </p>
      </div>
      <UploadForm />
    </main>
  );
}
