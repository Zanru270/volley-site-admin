"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, Edit2, HelpCircle, Loader2, Plus, Save, Trash2, Zap } from "lucide-react";
import {
  Badge,
  button,
  CountPill,
  Field,
  iconButton,
  iconButtonDanger,
  inputClass,
  labelClass,
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
import ConfirmationModal from "@/components/ConfirmationModal";
import { useConfirm } from "@/components/ConfirmProvider";
import { RowControls, StringList, useAction } from "@/components/forms";
import Sortable from "@/components/Sortable";
import type { FaqRow } from "@/lib/types";
import { saveFaqs } from "./faq-actions";

const TABS = { cool: "Cool Stuff", boring: "Boring Stuff" } as const;

/* The FAQs, one table per tab, as the home page's live editor shows them
   in a dialog (and its form view in a card). Every change (an edit, a
   delete, a new order) saves the whole list straight away through
   saveFaqs, so the order and the rows in Supabase always match what's on
   screen. A row is dragged by its grip, or moved with its arrows, within
   its own tab. A question is edited in place of the list, with a way back
   to it, rather than in a drawer over the dialog it's in. */
export default function FaqManager({ initial }: { initial: FaqRow[] }) {
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

  // The whole list with this tab's questions in `tabRows`' order.
  const withTab = (tabRows: FaqRow[]) => {
    let k = 0;
    return rows.map((r) => (r.tab === tab ? tabRows[k++] : r));
  };

  // The new order is already showing; it goes back if it can't be saved.
  const saveOrder = async (next: FaqRow[], before: FaqRow[]) => {
    const previous = withTab(before);
    const undo = () => {
      setRows(previous);
      void run(() => saveFaqs(previous), "Order put back");
    };
    if (!(await run(() => saveFaqs(withTab(next)), "Order saved", { label: "Undo", onClick: undo })))
      setRows(previous);
  };

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

  if (editing)
    return (
      <>
        <FaqForm
          faq={editing}
          isNew={!rows.some((r) => r.id === editing.id)}
          saving={pending}
          onBack={() => setEditing(null)}
          onSave={onSave}
        />
        <datalist id="faq-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </>
    );

  return (
    <>
      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-lemon/50 px-3 py-1 text-xs font-medium text-green">
        <Zap className="size-3.5" aria-hidden="true" /> The questions save straight away, as each one changes
      </p>
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
        <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
          <CountPill>
            {shown.length} {shown.length === 1 ? "question" : "questions"}
          </CountPill>
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
            className={`${button.primary} py-2! whitespace-nowrap`}
          >
            <Plus className="size-4" /> New question
          </button>
        </div>
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
          {/* Ordering only makes sense in the whole tab, not a search. */}
          <Sortable
            as="tbody"
            itemAs="tr"
            items={shown.map(({ row }) => row)}
            getKey={(row) => row.id}
            onChange={(next) => setRows(withTab(next))}
            onCommit={saveOrder}
            disabled={Boolean(q)}
            className={tbody}
            itemClassName={rowClass}
          >
            {(row, sort) => (
              <>
                <td className={td}>
                  <div className="flex items-start gap-4">
                    {sort.row.handle && <span className="-mr-3 -ml-3">{sort.row.handle}</span>}
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
                    {!q && <RowControls {...sort.row} handle={null} />}
                    <button type="button" onClick={() => setEditing(row)} className={iconButton} aria-label="Edit">
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(row)}
                      className={iconButtonDanger}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </>
            )}
          </Sortable>
          {shown.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-ink/50">
                  {q ? <>No questions match &quot;{search}&quot;</> : `No questions in ${TABS[tab]} yet.`}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      <p className="mt-3 text-xs text-ink/50">
        Categories show in the order of their first question.
      </p>

      <ConfirmationModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        title="Delete question"
        message={`Are you sure you want to delete "${deleting?.question}"? This can't be undone.`}
        isLoading={pending}
      />
    </>
  );
}

/* One question, in place of the list: Back (asking first if it's been
   changed) or Save Question, which saves it straight away. */
function FaqForm({
  faq: initial,
  isNew,
  saving,
  onBack,
  onSave,
}: {
  faq: FaqRow;
  isNew: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: (faq: FaqRow) => void;
}) {
  const [faq, setFaq] = useState(initial);
  const confirm = useConfirm();
  const dirty = JSON.stringify(faq) !== JSON.stringify(initial);
  const back = async () => {
    if (
      !dirty ||
      (await confirm({
        title: "Discard your changes?",
        message: "What you've changed in this question hasn't been saved. Go back anyway and lose it?",
        confirmText: "Discard changes",
        variant: "warning",
      }))
    )
      onBack();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(faq);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={back} disabled={saving} className={`${button.ghost} -ml-1`}>
          <ArrowLeft className="size-4" /> All questions
        </button>
      </div>
      <h3 className="font-publish text-2xl text-ink">{isNew ? "New question" : "Edit question"}</h3>
      <div className="space-y-2">
        <span className={labelClass}>Which list</span>
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
        <StringList values={faq.list} onChange={(list) => setFaq({ ...faq, list })} addLabel="Add a bullet" />
      </div>
      <div className="flex justify-end gap-2 border-t border-ink/8 pt-5">
        <button type="button" onClick={back} disabled={saving} className={button.secondary}>
          Cancel
        </button>
        <button type="submit" disabled={saving || (!isNew && !dirty)} className={button.primary}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isNew ? "Add question" : "Save question"}
        </button>
      </div>
    </form>
  );
}
