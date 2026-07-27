import type { ResumeData } from "@/lib/schema/resume";

// Text the heuristic parser couldn't confidently attribute to a section —
// the user drags/assigns it manually in the review form (PRODUCT_SPEC_FINAL.md §7).
export interface UnassignedBlock {
  id: string;
  text: string;
}

export interface ParseResult {
  data: ResumeData;
  unassigned: UnassignedBlock[];
}
