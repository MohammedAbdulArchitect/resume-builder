"use client";

import { useMemo, useState } from "react";
import { computeAtsScore } from "@/lib/ats/score";
import { getTemplate, templateRegistry } from "@/templates/registry";
import { Button } from "@/components/ui/button";
import type { ResumeData } from "@/lib/schema/resume";

export function TemplateGallery({ resumeId, data }: { resumeId: string; data: ResumeData }) {
  const [selectedSlug, setSelectedSlug] = useState(templateRegistry[0].slug);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const template = getTemplate(selectedSlug);
  const score = useMemo(() => (template ? computeAtsScore(template, data) : 0), [template, data]);

  async function handleDownload(format: "pdf" | "docx") {
    setDownloading(format);
    setError(null);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, format, template: selectedSlug }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not generate the file.");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = /filename="([^"]+)"/.exec(disposition);
      const filename = filenameMatch?.[1] ?? `resume.${format}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not reach the server — check your connection and try again.");
    } finally {
      setDownloading(null);
    }
  }

  if (!template) return null;
  const Template = template.component;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Choose a template</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
            <span className="text-neutral-500">ATS score</span>
            <span data-testid="ats-score" className="font-semibold">
              {score}/100
            </span>
          </div>
          <Button type="button" onClick={() => handleDownload("pdf")} disabled={downloading !== null}>
            {downloading === "pdf" ? "Preparing…" : "Download PDF"}
          </Button>
          <Button type="button" variant="outline" onClick={() => handleDownload("docx")} disabled={downloading !== null}>
            {downloading === "docx" ? "Preparing…" : "Download DOCX"}
          </Button>
        </div>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {templateRegistry.map((t) => (
          <Button
            key={t.slug}
            type="button"
            variant={t.slug === selectedSlug ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSlug(t.slug)}
          >
            {t.name}
          </Button>
        ))}
      </div>
      <p className="text-sm text-neutral-600">{template.description}</p>

      <div className="overflow-x-auto rounded-lg border border-border bg-neutral-100 p-6">
        <Template data={data} locale={data.meta.locale} />
      </div>
    </div>
  );
}
