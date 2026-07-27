import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h1 className="text-2xl font-semibold">ATS Resume &amp; CV Builder</h1>
      <p className="max-w-md text-neutral-600">
        Free ATS-safe resume formatter. Phase 1: project spine, schema, and one template.
      </p>
      <Link href="/template/preview" className="underline">
        View template preview
      </Link>
    </main>
  );
}
