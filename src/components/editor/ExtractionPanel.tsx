"use client";

import { useState, useCallback } from "react";
import type { ExtractionResult, ExtractedCharacter, ExtractedLocation, ExtractedEvent, ExtractedFact, ExtractedThread } from "@/lib/ai/prompts";

// ---- Props ----

interface Props {
  extraction: ExtractionResult;
  onConfirm: (edited: ExtractionResult) => void;
  onReject: () => void;
  saving: boolean;
}

// ---- Panel ----

export function ExtractionPanel({ extraction, onConfirm, onReject, saving }: Props) {
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState<ExtractionResult>(() => structuredClone(extraction));

  const handleConfirm = useCallback(() => {
    onConfirm(editing ? edited : extraction);
  }, [editing, edited, extraction, onConfirm]);

  return (
    <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-blue-100/50 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-blue-800">🔍 AI 结构化抽取</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            待审核
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editing}
              onChange={(e) => setEditing(e.target.checked)}
              className="rounded"
            />
            编辑后确认
          </label>
        </div>
      </div>

      {/* Summary */}
      <Section title="📝 摘要" defaultOpen>
        {editing ? (
          <div className="space-y-2">
            <Field label="短摘要" value={edited.summaryShort} onChange={(v) => setEdited({ ...edited, summaryShort: v })} />
            <Field label="长摘要" value={edited.summaryLong} onChange={(v) => setEdited({ ...edited, summaryLong: v })} textarea />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700">{extraction.summaryShort || "—"}</p>
            <p className="text-sm text-zinc-500">{extraction.summaryLong || "—"}</p>
          </div>
        )}
      </Section>

      {/* Characters */}
      <Section title={`👤 人物 (${countNew(extraction.characters)} 新)`} defaultOpen>
        {extraction.characters.length === 0 ? (
          <EmptyLabel />
        ) : editing ? (
          <CharEditor items={edited.characters} onChange={(v) => setEdited({ ...edited, characters: v })} />
        ) : (
          <TagList items={extraction.characters.map((c) => ({ label: c.name, sub: c.description, highlight: c.isNew }))} />
        )}
      </Section>

      {/* Locations */}
      <Section title={`📍 地点 (${countNew(extraction.locations)} 新)`}>
        {extraction.locations.length === 0 ? (
          <EmptyLabel />
        ) : editing ? (
          <LocEditor items={edited.locations} onChange={(v) => setEdited({ ...edited, locations: v })} />
        ) : (
          <TagList items={extraction.locations.map((l) => ({ label: l.name, sub: l.description, highlight: l.isNew }))} />
        )}
      </Section>

      {/* Events */}
      <Section title={`⏳ 事件 (${extraction.events.length})`}>
        {extraction.events.length === 0 ? (
          <EmptyLabel />
        ) : (
          <ul className="space-y-2">
            {(editing ? edited : extraction).events.map((ev, i) => (
              <li key={i} className="text-sm">
                {editing ? (
                  <div className="space-y-1">
                    <input className="w-full border rounded px-2 py-1 text-xs" value={ev.title} onChange={(e) => {
                      const next = [...edited.events]; next[i] = { ...next[i], title: e.target.value }; setEdited({ ...edited, events: next });
                    }} />
                    <input className="w-full border rounded px-2 py-1 text-xs" value={ev.description} onChange={(e) => {
                      const next = [...edited.events]; next[i] = { ...next[i], description: e.target.value }; setEdited({ ...edited, events: next });
                    }} />
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-zinc-700">{ev.title}</span>
                    {ev.eventTime && <span className="text-zinc-400 ml-2 text-xs">{ev.eventTime}</span>}
                    {ev.description && <p className="text-zinc-500 text-xs mt-0.5">{ev.description}</p>}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Facts */}
      <Section title={`📖 世界观事实 (${extraction.factsAdded.length})`}>
        {extraction.factsAdded.length === 0 ? (
          <EmptyLabel />
        ) : editing ? (
          <FactEditor items={edited.factsAdded} onChange={(v) => setEdited({ ...edited, factsAdded: v })} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {(editing ? edited : extraction).factsAdded.map((f, i) => (
              <span key={i} className="rounded bg-white border border-zinc-200 px-2.5 py-1 text-xs" title={f.value}>
                <span className="font-medium">{f.key}</span>
                <span className="text-zinc-400 ml-1">({f.category})</span>
                <span className="text-zinc-500 ml-1">— {f.value}</span>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Open threads */}
      <Section title={`🔗 未闭合叙事线 (${extraction.openThreads.length})`}>
        {extraction.openThreads.length === 0 ? (
          <EmptyLabel />
        ) : (
          <ul className="space-y-1.5">
            {(editing ? edited : extraction).openThreads.map((t, i) => (
              <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                <span className={`shrink-0 text-[10px] mt-0.5 ${t.status === "hinted" ? "text-purple-500" : "text-amber-500"}`}>
                  {t.status === "hinted" ? "💡" : "🔗"}
                </span>
                {editing ? (
                  <input className="flex-1 border rounded px-2 py-1 text-xs" value={t.description} onChange={(e) => {
                    const next = [...edited.openThreads]; next[i] = { ...next[i], description: e.target.value }; setEdited({ ...edited, openThreads: next });
                  }} />
                ) : (
                  <span>{t.description}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 px-5 py-3 bg-white border-t border-blue-200">
        <button
          onClick={onReject}
          disabled={saving}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          丢弃
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "✓ 确认并保存"}
        </button>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-blue-100 last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-blue-100/30 transition-colors">
        <span className="text-[10px] text-zinc-400">{open ? "▼" : "▶"}</span>
        <span className="text-sm font-medium text-zinc-600">{title}</span>
      </button>
      {open && <div className="px-5 pb-3">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  const cls = "w-full border rounded px-2 py-1 text-xs";
  return (
    <div>
      <span className="text-[10px] text-zinc-400">{label}</span>
      {textarea ? (
        <textarea className={cls} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function TagList({ items }: { items: { label: string; sub: string; highlight: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs border ${item.highlight ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-white border-zinc-200 text-zinc-600"}`} title={item.sub}>
          {item.label}
          {item.highlight && <span className="ml-1 text-[10px] text-amber-500">新</span>}
        </span>
      ))}
    </div>
  );
}

function CharEditor({ items, onChange }: { items: ExtractedCharacter[]; onChange: (v: ExtractedCharacter[]) => void }) {
  return (
    <div className="space-y-1.5">
      {items.map((c, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input className="flex-1 border rounded px-2 py-1 text-xs" value={c.name} placeholder="姓名" onChange={(e) => { const n = [...items]; n[i] = { ...n[i], name: e.target.value }; onChange(n); }} />
          <input className="flex-1 border rounded px-2 py-1 text-xs" value={c.description} placeholder="描述" onChange={(e) => { const n = [...items]; n[i] = { ...n[i], description: e.target.value }; onChange(n); }} />
          <label className="text-[10px] shrink-0"><input type="checkbox" checked={c.isNew} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], isNew: e.target.checked }; onChange(n); }} className="mr-0.5" />新</label>
        </div>
      ))}
    </div>
  );
}

function LocEditor({ items, onChange }: { items: ExtractedLocation[]; onChange: (v: ExtractedLocation[]) => void }) {
  return (
    <div className="space-y-1.5">
      {items.map((l, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input className="flex-1 border rounded px-2 py-1 text-xs" value={l.name} placeholder="地点名" onChange={(e) => { const n = [...items]; n[i] = { ...n[i], name: e.target.value }; onChange(n); }} />
          <input className="flex-1 border rounded px-2 py-1 text-xs" value={l.description} placeholder="描述" onChange={(e) => { const n = [...items]; n[i] = { ...n[i], description: e.target.value }; onChange(n); }} />
          <label className="text-[10px] shrink-0"><input type="checkbox" checked={l.isNew} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], isNew: e.target.checked }; onChange(n); }} className="mr-0.5" />新</label>
        </div>
      ))}
    </div>
  );
}

function FactEditor({ items, onChange }: { items: ExtractedFact[]; onChange: (v: ExtractedFact[]) => void }) {
  return (
    <div className="space-y-1.5">
      {items.map((f, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input className="w-24 border rounded px-2 py-1 text-xs" value={f.key} placeholder="键" onChange={(e) => { const n = [...items]; n[i] = { ...n[i], key: e.target.value }; onChange(n); }} />
          <input className="flex-1 border rounded px-2 py-1 text-xs" value={f.value} placeholder="值" onChange={(e) => { const n = [...items]; n[i] = { ...n[i], value: e.target.value }; onChange(n); }} />
          <input className="w-20 border rounded px-2 py-1 text-xs" value={f.category} placeholder="分类" onChange={(e) => { const n = [...items]; n[i] = { ...n[i], category: e.target.value }; onChange(n); }} />
        </div>
      ))}
    </div>
  );
}

function EmptyLabel() {
  return <p className="text-xs text-zinc-400 italic">无</p>;
}

function countNew(items: { isNew: boolean }[]): number {
  return items.filter((i) => i.isNew).length;
}
