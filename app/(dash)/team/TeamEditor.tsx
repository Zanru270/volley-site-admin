"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2, User } from "lucide-react";
import {
  Badge,
  button,
  CountPill,
  Field,
  iconButtonDanger,
  inputClass,
  PageHeader,
  row,
  tableHead,
  tableWrap,
  tbody,
  td,
  th,
  Toolbar,
} from "@/components/ui";
import EditModal from "@/components/EditModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useAction } from "@/components/forms";
import { addAdmin, removeAdmin } from "./actions";

type Admin = { email: string; name: string; created_at: string };

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));

const BLANK = { email: "", name: "", password: "" };

/* Everyone who can sign in, like the Bow + Arc CMS's admin list in
   Settings: add someone in the drawer, remove them after a confirm. */
export default function TeamEditor({ admins, me }: { admins: Admin[]; me: string }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [removing, setRemoving] = useState<Admin | null>(null);
  const { pending, run } = useAction();
  const isMe = (email: string) => email.toLowerCase() === me.toLowerCase();

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => addAdmin(form), "Added to the team")) {
      setAdding(false);
      setForm(BLANK);
    }
  };

  const onRemove = async () => {
    if (!removing) return;
    await run(() => removeAdmin(removing.email), "Removed from the team");
    setRemoving(null);
  };

  return (
    <>
      <PageHeader
        title="Team"
        description="Everyone who can sign in to this admin. Everyone here can do everything."
        actions={
          <button type="button" onClick={() => setAdding(true)} className={`${button.primary} w-full sm:w-auto`}>
            <Plus className="size-4" /> Add Admin
          </button>
        }
      />

      <Toolbar>
        <span className="text-sm text-ink/50">People with access to the Volley CMS.</span>
        <CountPill>
          {admins.length} {admins.length === 1 ? "Admin" : "Admins"}
        </CountPill>
      </Toolbar>

      <div className={tableWrap}>
        <table className="w-full text-left text-sm">
          <thead className={tableHead}>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Added</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {admins.map((a) => (
              <tr key={a.email} className={row}>
                <td className={td}>
                  <div className="flex items-center gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bone/60 text-ink/40">
                      <User className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        {a.name || a.email} {isMe(a.email) && <Badge tone="lemon">You</Badge>}
                      </p>
                      {a.name && <p className="mt-1 text-xs text-ink/50">{a.email}</p>}
                    </div>
                  </div>
                </td>
                <td className={`${td} whitespace-nowrap text-ink/60`}>{formatDate(a.created_at)}</td>
                <td className={td}>
                  <div className="flex justify-end">
                    {!isMe(a.email) && (
                      <button
                        type="button"
                        onClick={() => setRemoving(a)}
                        className={iconButtonDanger}
                        aria-label={`Remove ${a.email}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        title="Add Admin"
        formId="admin-form"
        saveLabel="Add to Team"
        isSaving={pending}
      >
        <form id="admin-form" onSubmit={onAdd} className="space-y-6">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Email Address">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Password" hint="At least 10 characters. Send it to them privately.">
            <input
              type="text"
              required
              minLength={10}
              autoComplete="off"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
            />
          </Field>
        </form>
      </EditModal>

      <ConfirmationModal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={onRemove}
        title="Remove Admin"
        message={`Remove ${removing?.email}? They won't be able to sign in here any more.`}
        confirmText="Remove"
        isLoading={pending}
      />
    </>
  );
}
