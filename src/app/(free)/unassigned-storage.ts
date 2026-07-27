import type { UnassignedBlock } from "@/lib/parsers/types";

// Unassigned blocks are a parse-time-only concept (PRODUCT_SPEC_FINAL.md §7)
// — never persisted to the DB. They're handed off from /upload to
// /review/[resumeId] across the client-side navigation via sessionStorage,
// consumed once, then cleared. Revisiting a resume later shows none, which
// is expected: the user was meant to resolve them before leaving.
function storageKey(resumeId: string): string {
  return `resume-unassigned:${resumeId}`;
}

export function stashUnassignedBlocks(resumeId: string, blocks: UnassignedBlock[]): void {
  if (blocks.length === 0) return;
  sessionStorage.setItem(storageKey(resumeId), JSON.stringify(blocks));
}

export function takeUnassignedBlocks(resumeId: string): UnassignedBlock[] {
  const raw = sessionStorage.getItem(storageKey(resumeId));
  if (!raw) return [];
  sessionStorage.removeItem(storageKey(resumeId));
  try {
    return JSON.parse(raw) as UnassignedBlock[];
  } catch {
    return [];
  }
}
