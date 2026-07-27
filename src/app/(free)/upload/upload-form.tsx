"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { stashUnassignedBlocks } from "@/app/(free)/unassigned-storage";
import type { UnassignedBlock } from "@/lib/parsers/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt"];

function validateFile(file: File): string | null {
  const extension = file.name.toLowerCase().split(".").pop();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return "Unsupported file type — use PDF, DOCX, or TXT.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "File exceeds the 10MB limit.";
  }
  return null;
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse", { method: "POST", body: formData });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Something went wrong while parsing that file.");
        setIsUploading(false);
        return;
      }

      const body = (await response.json()) as {
        resumeId: string;
        unassigned: UnassignedBlock[];
      };
      stashUnassignedBlocks(body.resumeId, body.unassigned);
      router.push(`/review/${body.resumeId}`);
    } catch {
      setError("Could not reach the server — check your connection and try again.");
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void uploadFile(file);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          isDragging ? "border-primary bg-muted" : "border-border"
        }`}
      >
        <p className="text-sm font-medium">Drag and drop your resume here</p>
        <p className="text-xs text-neutral-500">PDF, DOCX, or TXT — up to 10MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          Choose file
        </Button>
      </div>

      {isUploading ? <p className="text-sm text-neutral-600">Parsing your resume…</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
