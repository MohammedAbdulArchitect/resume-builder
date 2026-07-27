"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
  ResumeData,
  SkillEntry,
} from "@/lib/schema/resume";
import type { UnassignedBlock } from "@/lib/parsers/types";
import { takeUnassignedBlocks } from "@/app/(free)/unassigned-storage";
import { computeAtsScore } from "@/lib/ats/score";
import { getTemplate } from "@/templates/registry";
import { saveResumeData } from "@/app/(free)/review/[resumeId]/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Updater = Dispatch<SetStateAction<ResumeData>>;

type AssignTarget =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "achievements";

const ASSIGN_TARGETS: { value: AssignTarget; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "experience", label: "Experience (new bullet)" },
  { value: "education", label: "Education (new highlight)" },
  { value: "skills", label: "Skills" },
  { value: "projects", label: "Projects (new bullet)" },
  { value: "certifications", label: "Certifications" },
  { value: "achievements", label: "Achievements" },
];

const ATS_PLAIN = (() => {
  const template = getTemplate("ats-plain");
  if (!template) throw new Error("ats-plain template is not registered");
  return template;
})();

function moveItem<T>(arr: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= arr.length) return arr;
  const copy = [...arr];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

function removeAt<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index);
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-600">{label}</span>
      <input
        className="rounded-md border border-border bg-background px-3 py-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-600">{label}</span>
      <textarea
        className="min-h-24 rounded-md border border-border bg-background px-3 py-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">{title}</h2>
      {onAdd ? (
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus /> {addLabel}
        </Button>
      ) : null}
    </div>
  );
}

function EntryControls({
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-3 flex justify-end gap-2">
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Move up" onClick={onMoveUp}>
        <ChevronUp />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Move down" onClick={onMoveDown}>
        <ChevronDown />
      </Button>
      <Button type="button" size="sm" variant="destructive" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

function AtsScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
      <span className="text-neutral-500">ATS score</span>
      <span data-testid="ats-score" className="font-semibold">
        {score}/100
      </span>
    </div>
  );
}

function PersonalSection({ data, setData }: { data: ResumeData; setData: Updater }) {
  const personal = data.personal;
  function update(patch: Partial<ResumeData["personal"]>) {
    setData((prev) => ({ ...prev, personal: { ...prev.personal, ...patch } }));
  }

  return (
    <section>
      <SectionHeader title="Personal" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabeledInput label="Full name" value={personal.fullName ?? ""} onChange={(v) => update({ fullName: v })} />
        <LabeledInput label="Headline" value={personal.headline ?? ""} onChange={(v) => update({ headline: v })} />
        <LabeledInput label="Email" value={personal.email ?? ""} onChange={(v) => update({ email: v })} />
        <LabeledInput label="Phone" value={personal.phone ?? ""} onChange={(v) => update({ phone: v })} />
        <LabeledInput label="Location" value={personal.location ?? ""} onChange={(v) => update({ location: v })} />
      </div>
    </section>
  );
}

function SummarySection({ data, setData }: { data: ResumeData; setData: Updater }) {
  return (
    <section>
      <SectionHeader title="Summary" />
      <LabeledTextarea
        label="Summary"
        value={data.summary?.text ?? ""}
        onChange={(text) =>
          setData((prev) => ({ ...prev, summary: text ? { text, origin: "source" } : undefined }))
        }
      />
    </section>
  );
}

function ExperienceSection({ data, setData }: { data: ResumeData; setData: Updater }) {
  const entries = data.experience;

  function updateEntries(next: ExperienceEntry[]) {
    setData((prev) => ({ ...prev, experience: next }));
  }
  function updateEntry(index: number, patch: Partial<ExperienceEntry>) {
    const next = [...entries];
    next[index] = { ...next[index], ...patch };
    updateEntries(next);
  }

  return (
    <section>
      <SectionHeader
        title="Experience"
        addLabel="Add experience"
        onAdd={() => updateEntries([...entries, { current: false, bullets: [] }])}
      />
      <div className="flex flex-col gap-4">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LabeledInput label="Title" value={entry.title ?? ""} onChange={(v) => updateEntry(i, { title: v })} />
              <LabeledInput
                label="Company"
                value={entry.company ?? ""}
                onChange={(v) => updateEntry(i, { company: v })}
              />
              <LabeledInput
                label="Location"
                value={entry.location ?? ""}
                onChange={(v) => updateEntry(i, { location: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <LabeledInput label="Start" value={entry.start ?? ""} onChange={(v) => updateEntry(i, { start: v })} />
                <LabeledInput label="End" value={entry.end ?? ""} onChange={(v) => updateEntry(i, { end: v })} />
              </div>
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={entry.current}
                onChange={(e) => updateEntry(i, { current: e.target.checked })}
              />
              Current role
            </label>

            <div className="mt-3 flex flex-col gap-2">
              {entry.bullets.map((bullet, j) => (
                <div key={j} className="flex items-start gap-2">
                  <textarea
                    className="min-h-16 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    value={bullet.text}
                    onChange={(e) => {
                      const bullets = [...entry.bullets];
                      bullets[j] = { ...bullets[j], text: e.target.value };
                      updateEntry(i, { bullets });
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Move bullet up"
                      onClick={() => updateEntry(i, { bullets: moveItem(entry.bullets, j, -1) })}
                    >
                      <ChevronUp />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Move bullet down"
                      onClick={() => updateEntry(i, { bullets: moveItem(entry.bullets, j, 1) })}
                    >
                      <ChevronDown />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      aria-label="Remove bullet"
                      onClick={() => updateEntry(i, { bullets: removeAt(entry.bullets, j) })}
                    >
                      <X />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateEntry(i, { bullets: [...entry.bullets, { text: "", origin: "source" }] })}
              >
                <Plus /> Add bullet
              </Button>
            </div>

            <EntryControls
              onMoveUp={() => updateEntries(moveItem(entries, i, -1))}
              onMoveDown={() => updateEntries(moveItem(entries, i, 1))}
              onRemove={() => updateEntries(removeAt(entries, i))}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function EducationSection({ data, setData }: { data: ResumeData; setData: Updater }) {
  const entries = data.education;

  function updateEntries(next: EducationEntry[]) {
    setData((prev) => ({ ...prev, education: next }));
  }
  function updateEntry(index: number, patch: Partial<EducationEntry>) {
    const next = [...entries];
    next[index] = { ...next[index], ...patch };
    updateEntries(next);
  }

  return (
    <section>
      <SectionHeader
        title="Education"
        addLabel="Add education"
        onAdd={() => updateEntries([...entries, { highlights: [] }])}
      />
      <div className="flex flex-col gap-4">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LabeledInput
                label="Institution"
                value={entry.institution ?? ""}
                onChange={(v) => updateEntry(i, { institution: v })}
              />
              <LabeledInput label="Degree" value={entry.degree ?? ""} onChange={(v) => updateEntry(i, { degree: v })} />
              <LabeledInput label="Field" value={entry.field ?? ""} onChange={(v) => updateEntry(i, { field: v })} />
              <div className="grid grid-cols-2 gap-2">
                <LabeledInput label="Start" value={entry.start ?? ""} onChange={(v) => updateEntry(i, { start: v })} />
                <LabeledInput label="End" value={entry.end ?? ""} onChange={(v) => updateEntry(i, { end: v })} />
              </div>
              <LabeledInput label="Grade" value={entry.grade ?? ""} onChange={(v) => updateEntry(i, { grade: v })} />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {entry.highlights.map((highlight, j) => (
                <div key={j} className="flex items-start gap-2">
                  <textarea
                    className="min-h-12 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    value={highlight}
                    onChange={(e) => {
                      const highlights = [...entry.highlights];
                      highlights[j] = e.target.value;
                      updateEntry(i, { highlights });
                    }}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    aria-label="Remove highlight"
                    onClick={() => updateEntry(i, { highlights: removeAt(entry.highlights, j) })}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateEntry(i, { highlights: [...entry.highlights, ""] })}
              >
                <Plus /> Add highlight
              </Button>
            </div>

            <EntryControls
              onMoveUp={() => updateEntries(moveItem(entries, i, -1))}
              onMoveDown={() => updateEntries(moveItem(entries, i, 1))}
              onRemove={() => updateEntries(removeAt(entries, i))}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function SkillsSection({ data, setData }: { data: ResumeData; setData: Updater }) {
  const entries = data.skills;
  function updateEntries(next: SkillEntry[]) {
    setData((prev) => ({ ...prev, skills: next }));
  }

  return (
    <section>
      <SectionHeader
        title="Skills"
        addLabel="Add skill"
        onAdd={() => updateEntries([...entries, { name: "" }])}
      />
      <div className="flex flex-col gap-2">
        {entries.map((skill, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              value={skill.name}
              onChange={(e) => {
                const next = [...entries];
                next[i] = { ...next[i], name: e.target.value };
                updateEntries(next);
              }}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label="Remove skill"
              onClick={() => updateEntries(removeAt(entries, i))}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectsSection({ data, setData }: { data: ResumeData; setData: Updater }) {
  const entries = data.projects;

  function updateEntries(next: ProjectEntry[]) {
    setData((prev) => ({ ...prev, projects: next }));
  }
  function updateEntry(index: number, patch: Partial<ProjectEntry>) {
    const next = [...entries];
    next[index] = { ...next[index], ...patch };
    updateEntries(next);
  }

  return (
    <section>
      <SectionHeader
        title="Projects"
        addLabel="Add project"
        onAdd={() => updateEntries([...entries, { stack: [], bullets: [] }])}
      />
      <div className="flex flex-col gap-4">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LabeledInput label="Name" value={entry.name ?? ""} onChange={(v) => updateEntry(i, { name: v })} />
              <LabeledInput label="Role" value={entry.role ?? ""} onChange={(v) => updateEntry(i, { role: v })} />
              <LabeledInput
                label="Stack (comma-separated)"
                value={entry.stack.join(", ")}
                onChange={(v) => updateEntry(i, { stack: v.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
              <LabeledInput label="Link" value={entry.link ?? ""} onChange={(v) => updateEntry(i, { link: v })} />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {entry.bullets.map((bullet, j) => (
                <div key={j} className="flex items-start gap-2">
                  <textarea
                    className="min-h-16 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    value={bullet.text}
                    onChange={(e) => {
                      const bullets = [...entry.bullets];
                      bullets[j] = { ...bullets[j], text: e.target.value };
                      updateEntry(i, { bullets });
                    }}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    aria-label="Remove bullet"
                    onClick={() => updateEntry(i, { bullets: removeAt(entry.bullets, j) })}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateEntry(i, { bullets: [...entry.bullets, { text: "", origin: "source" }] })}
              >
                <Plus /> Add bullet
              </Button>
            </div>

            <EntryControls
              onMoveUp={() => updateEntries(moveItem(entries, i, -1))}
              onMoveDown={() => updateEntries(moveItem(entries, i, 1))}
              onRemove={() => updateEntries(removeAt(entries, i))}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function CertificationsSection({ data, setData }: { data: ResumeData; setData: Updater }) {
  const entries = data.certifications;
  function updateEntries(next: CertificationEntry[]) {
    setData((prev) => ({ ...prev, certifications: next }));
  }

  return (
    <section>
      <SectionHeader
        title="Certifications"
        addLabel="Add certification"
        onAdd={() => updateEntries([...entries, {}])}
      />
      <div className="flex flex-col gap-3">
        {entries.map((cert, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <LabeledInput
              label="Name"
              value={cert.name ?? ""}
              onChange={(v) => {
                const next = [...entries];
                next[i] = { ...next[i], name: v };
                updateEntries(next);
              }}
            />
            <LabeledInput
              label="Issuer"
              value={cert.issuer ?? ""}
              onChange={(v) => {
                const next = [...entries];
                next[i] = { ...next[i], issuer: v };
                updateEntries(next);
              }}
            />
            <LabeledInput
              label="Date"
              value={cert.date ?? ""}
              onChange={(v) => {
                const next = [...entries];
                next[i] = { ...next[i], date: v };
                updateEntries(next);
              }}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label="Remove certification"
              onClick={() => updateEntries(removeAt(entries, i))}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AchievementsSection({ data, setData }: { data: ResumeData; setData: Updater }) {
  const entries = data.achievements;
  function updateEntries(next: string[]) {
    setData((prev) => ({ ...prev, achievements: next }));
  }

  return (
    <section>
      <SectionHeader
        title="Achievements"
        addLabel="Add achievement"
        onAdd={() => updateEntries([...entries, ""])}
      />
      <div className="flex flex-col gap-2">
        {entries.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              value={line}
              onChange={(e) => {
                const next = [...entries];
                next[i] = e.target.value;
                updateEntries(next);
              }}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Move up"
              onClick={() => updateEntries(moveItem(entries, i, -1))}
            >
              <ChevronUp />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Move down"
              onClick={() => updateEntries(moveItem(entries, i, 1))}
            >
              <ChevronDown />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label="Remove achievement"
              onClick={() => updateEntries(removeAt(entries, i))}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function LanguagesSection({ data, setData }: { data: ResumeData; setData: Updater }) {
  const entries = data.languages;
  function updateEntries(next: LanguageEntry[]) {
    setData((prev) => ({ ...prev, languages: next }));
  }

  return (
    <section>
      <SectionHeader
        title="Languages"
        addLabel="Add language"
        onAdd={() => updateEntries([...entries, { name: "" }])}
      />
      <div className="flex flex-col gap-2">
        {entries.map((lang, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              placeholder="Language"
              value={lang.name}
              onChange={(e) => {
                const next = [...entries];
                next[i] = { ...next[i], name: e.target.value };
                updateEntries(next);
              }}
            />
            <input
              className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              placeholder="Level"
              value={lang.level ?? ""}
              onChange={(e) => {
                const next = [...entries];
                next[i] = { ...next[i], level: e.target.value };
                updateEntries(next);
              }}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label="Remove language"
              onClick={() => updateEntries(removeAt(entries, i))}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function UnassignedBlockItem({
  block,
  onAssign,
}: {
  block: UnassignedBlock;
  onAssign: (block: UnassignedBlock, target: AssignTarget) => void;
}) {
  const [target, setTarget] = useState<AssignTarget>("summary");

  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", block.id)}
      className="flex flex-col gap-2 rounded-md border border-amber-300 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="whitespace-pre-wrap text-sm">{block.text}</p>
      <div className="flex shrink-0 items-center gap-2">
        <select
          aria-label="Section to add this text to"
          value={target}
          onChange={(e) => setTarget(e.target.value as AssignTarget)}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          {ASSIGN_TARGETS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" onClick={() => onAssign(block, target)}>
          Add
        </Button>
      </div>
    </li>
  );
}

function UnassignedPanel({
  blocks,
  onAssign,
}: {
  blocks: UnassignedBlock[];
  onAssign: (block: UnassignedBlock, target: AssignTarget) => void;
}) {
  return (
    <section className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">Unassigned content</h2>
      <p className="mt-1 text-xs text-amber-700">
        We couldn&apos;t confidently place this text. Drag it onto a section below, or pick one here.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {blocks.map((block) => (
          <UnassignedBlockItem key={block.id} block={block} onAssign={onAssign} />
        ))}
      </ul>
    </section>
  );
}

export function ReviewForm({ resumeId, initialData }: { resumeId: string; initialData: ResumeData }) {
  const [data, setData] = useState<ResumeData>(initialData);
  // Lazy initializer reads sessionStorage on first client render — avoids
  // an effect+setState double-render, and is guarded for the SSR pass
  // where sessionStorage doesn't exist.
  const [unassigned, setUnassigned] = useState<UnassignedBlock[]>(() =>
    typeof window === "undefined" ? [] : takeUnassignedBlocks(resumeId),
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const score = useMemo(() => computeAtsScore(ATS_PLAIN, data), [data]);

  function assignBlock(block: UnassignedBlock, target: AssignTarget) {
    setData((prev) => {
      switch (target) {
        case "summary": {
          const text = prev.summary?.text ? `${prev.summary.text}\n${block.text}` : block.text;
          return { ...prev, summary: { text, origin: "source" } };
        }
        case "experience": {
          if (prev.experience.length === 0) {
            return {
              ...prev,
              experience: [{ current: false, bullets: [{ text: block.text, origin: "source" }] }],
            };
          }
          const experience = [...prev.experience];
          const last = experience[experience.length - 1];
          experience[experience.length - 1] = {
            ...last,
            bullets: [...last.bullets, { text: block.text, origin: "source" }],
          };
          return { ...prev, experience };
        }
        case "education": {
          if (prev.education.length === 0) {
            return { ...prev, education: [{ highlights: [block.text] }] };
          }
          const education = [...prev.education];
          const last = education[education.length - 1];
          education[education.length - 1] = { ...last, highlights: [...last.highlights, block.text] };
          return { ...prev, education };
        }
        case "skills": {
          const names = block.text
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
          return { ...prev, skills: [...prev.skills, ...names.map((name) => ({ name }))] };
        }
        case "projects": {
          if (prev.projects.length === 0) {
            return { ...prev, projects: [{ stack: [], bullets: [{ text: block.text, origin: "source" }] }] };
          }
          const projects = [...prev.projects];
          const last = projects[projects.length - 1];
          projects[projects.length - 1] = {
            ...last,
            bullets: [...last.bullets, { text: block.text, origin: "source" }],
          };
          return { ...prev, projects };
        }
        case "certifications":
          return { ...prev, certifications: [...prev.certifications, { name: block.text }] };
        case "achievements":
          return { ...prev, achievements: [...prev.achievements, block.text] };
      }
    });
    setUnassigned((prev) => prev.filter((b) => b.id !== block.id));
  }

  function handleSectionDrop(target: AssignTarget) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const blockId = e.dataTransfer.getData("text/plain");
      const block = unassigned.find((b) => b.id === blockId);
      if (block) assignBlock(block, target);
    };
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError(null);
    const result = await saveResumeData(resumeId, data);
    if (result.ok) {
      setSaveState("saved");
    } else {
      setSaveState("error");
      setSaveError(result.error ?? "Could not save.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Review your resume</h1>
        <div className="flex items-center gap-3">
          <AtsScoreBadge score={score} />
          <Button type="button" onClick={handleSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>
      {saveState === "saved" ? <p className="text-sm text-green-700">Saved.</p> : null}
      {saveState === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}

      {unassigned.length > 0 ? <UnassignedPanel blocks={unassigned} onAssign={assignBlock} /> : null}

      <PersonalSection data={data} setData={setData} />
      <Separator />
      <div onDragOver={(e) => e.preventDefault()} onDrop={handleSectionDrop("summary")}>
        <SummarySection data={data} setData={setData} />
      </div>
      <Separator />
      <div onDragOver={(e) => e.preventDefault()} onDrop={handleSectionDrop("experience")}>
        <ExperienceSection data={data} setData={setData} />
      </div>
      <Separator />
      <div onDragOver={(e) => e.preventDefault()} onDrop={handleSectionDrop("education")}>
        <EducationSection data={data} setData={setData} />
      </div>
      <Separator />
      <div onDragOver={(e) => e.preventDefault()} onDrop={handleSectionDrop("skills")}>
        <SkillsSection data={data} setData={setData} />
      </div>
      <Separator />
      <div onDragOver={(e) => e.preventDefault()} onDrop={handleSectionDrop("projects")}>
        <ProjectsSection data={data} setData={setData} />
      </div>
      <Separator />
      <div onDragOver={(e) => e.preventDefault()} onDrop={handleSectionDrop("certifications")}>
        <CertificationsSection data={data} setData={setData} />
      </div>
      <Separator />
      <div onDragOver={(e) => e.preventDefault()} onDrop={handleSectionDrop("achievements")}>
        <AchievementsSection data={data} setData={setData} />
      </div>
      <Separator />
      <LanguagesSection data={data} setData={setData} />
    </div>
  );
}
