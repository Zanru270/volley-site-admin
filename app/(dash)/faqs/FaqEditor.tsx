"use client";

import { useState, type FormEvent } from "react";
import { Edit2, HelpCircle, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  button,
  CountPill,
  Field,
  iconButton,
  iconButtonDanger,
  inputClass,
  labelClass,
  PageHeader,
  row as rowClass,
  SearchBox,
  tab as tabClass,
  tableHead,
  tableWrap,
  tabs,
  tbody,
  td,
  textareaClass,
  th,
  Toolbar,
} from "@/components/ui";
import EditModal from "@/components/EditModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import { move, RowControls, StringList, useAction } from "@/components/forms";
import type { FaqRow } from "@/lib/types";
import { saveFaqs } from "./actions";

const TABS = { cool: "Cool Stuff", boring: "Boring Stuff" } as const;

/* The FAQs, one table per tab. Every change (an edit, a delete, a move)
   saves the whole list straight away through saveFaqs, so the order and
   the rows in Supabase always match what's on screen. */
export default function FaqEditor({ initial }: { initial: FaqRow[] }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<FaqRow["tab"]>("cool");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FaqRow | null>(null);
  const [deleting, setDeleting] = useState<FaqRow | null>(null);
  const { pending, run } = useAction();

  const inTab = rows.map((row, i) => ({ row, i })).filter(({ row }) => row.tab === tab);
  const q = search.trim().toLowerCase();
  const shown = q
    ? inTab.filter(({ row }) =>
        [row.question, row.answer, row.category].some((t) => t.toLowerCase().includes(q)),
      )
    : inTab;
  const categories = [...new Set(inTab.map(({ row }) => row.category).filter(Boolean))];

  // Saves the list, and only shows it once Supabase has it.
  const persist = async (next: FaqRow[], title: string) => {
    const ok = await run(() => saveFaqs(next), title);
    if (ok) setRows(next);
    return ok;
  };

  const onSave = async (faq: FaqRow) => {
    const exists = rows.some((r) => r.id === faq.id);
    const next = exists ? rows.map((r) => (r.id === faq.id ? faq : r)) : [...rows, faq];
    if (await persist(next, exists ? "Question saved" : "Question added")) setEditing(null);
  };

  const onDelete = async () => {
    if (!deleting) return;
    await persist(rows.filter((r) => r.id !== deleting.id), "Question deleted");
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="FAQs"
        description='The Frequently Asked Questions on the home page, under its "Cool Stuff" and "Boring Stuff" toggles. Categories show in the order of their first question.'
        actions={
          <button
            type="button"
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                tab,
                category: categories.at(-1) ?? "",
                question: "",
                answer: "",
                list: [],
              })
            }
            className={`${button.primary} w-full sm:w-auto`}
          >
            <Plus className="size-4" /> New Question
          </button>
        }
      />

      <Toolbar>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <div className={tabs}>
            {Object.entries(TABS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key as FaqRow["tab"])}
                className={tabClass(tab === key)}
              >
                {label} ({rows.filter((r) => r.tab === key).length})
              </button>
            ))}
          </div>
          <SearchBox value={search} onChange={setSearch} placeholder="Search questions..." />
        </div>
        <CountPill>
          {shown.length} {shown.length === 1 ? "question" : "questions"}
        </CountPill>
      </Toolbar>

      <div className={tableWrap}>
        <table className="w-full text-left text-sm">
          <thead className={tableHead}>
            <tr>
              <th className={th}>Question</th>
              <th className={th}>Category</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {shown.map(({ row, i }, k) => (
              <tr key={row.id} className={rowClass}>
                <td className={td}>
                  <div className="flex items-start gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bone/60 text-ink/40">
                      <HelpCircle className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{row.question}</p>
                      <p className="mt-1 line-clamp-2 max-w-xl text-xs text-ink/50">{row.answer}</p>
                    </div>
                  </div>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <Badge>{row.category || "None"}</Badge>
                </td>
                <td className={td}>
                  <div className="flex justify-end">
                    {/* Moving only makes sense in the full list, not a search. */}
                    {!q && (
                      <RowControls
                        index={k}
                        count={shown.length}
                        onMove={(a, b) => persist(move(rows, shown[a].i, shown[b].i), "Order saved")}
                      />
                    )}
                    <button type="button" onClick={() => setEditing(row)} className={iconButton} aria-label="Edit">
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(rows[i])}
                      className={iconButtonDanger}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-ink/50">
                  {q ? <>No questions match &quot;{search}&quot;</> : `No questions in ${TABS[tab]} yet.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <datalist id="faq-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {editing && (
        <FaqModal
          faq={editing}
          isNew={!rows.some((r) => r.id === editing.id)}
          saving={pending}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}

      <ConfirmationModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        title="Delete Question"
        message={`Are you sure you want to delete "${deleting?.question}"? This can't be undone.`}
        isLoading={pending}
      />
    </>
  );
}

function FaqModal({
  faq: initial,
  isNew,
  saving,
  onClose,
  onSave,
}: {
  faq: FaqRow;
  isNew: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (faq: FaqRow) => void;
}) {
  const [faq, setFaq] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(faq);
  };

  return (
    <EditModal
      isOpen
      onClose={onClose}
      title={isNew ? "Add Question" : "Edit Question"}
      formId="faq-form"
      saveLabel="Save Question"
      isSaving={saving}
    >
      <form id="faq-form" onSubmit={submit} className="space-y-6">
        <div className="space-y-2">
          <span className={labelClass}>Toggle</span>
          <div className={tabs}>
            {Object.entries(TABS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFaq({ ...faq, tab: key as FaqRow["tab"] })}
                className={tabClass(faq.tab === key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Category" hint="Pick an existing one to group questions together.">
          <input
            list="faq-categories"
            required
            value={faq.category}
            onChange={(e) => setFaq({ ...faq, category: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Question">
          <input
            required
            value={faq.question}
            onChange={(e) => setFaq({ ...faq, question: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Answer">
          <textarea
            rows={5}
            value={faq.answer}
            onChange={(e) => setFaq({ ...faq, answer: e.target.value })}
            className={textareaClass}
          />
        </Field>
        <div className="space-y-2 border-t border-ink/10 pt-6">
          <span className={labelClass}>
            Bullet points <span className="tracking-normal normal-case">(optional, under the answer)</span>
          </span>
          <StringList
            values={faq.list}
            onChange={(list) => setFaq({ ...faq, list })}
            addLabel="Add a bullet"
          />
        </div>
      </form>
    </EditModal>
  );
}
