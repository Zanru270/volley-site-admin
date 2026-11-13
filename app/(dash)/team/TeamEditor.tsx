"use client";

import { useOptimistic, useState, type FormEvent } from "react";
import { Edit2, Plus, Trash2, User, Users } from "lucide-react";
import {
  Badge,
  button,
  CountPill,
  Field,
  iconButton,
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
import { addAdmin, removeAdmin, updateAdmin } from "./actions";

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
   Settings: add someone, or change their name or password, in the drawer;
   remove them after a confirm. */
export default function TeamEditor({ admins: saved, me }: { admins: Admin[]; me: string }) {
  // Someone removed goes from the list at once, and comes back if they couldn't be.
  const [admins, hide] = useOptimistic(saved, (all, email: string) => all.filter((a) => a.email !== email));
  // The drawer: adding someone, or editing who's in `editing`.
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [form, setForm] = useState(BLANK);
  const [start, setStart] = useState(BLANK);
  const open = (admin: Admin | null) => {
    const next = admin ? { email: admin.email, name: admin.name, password: "" } : BLANK;
    setEditing(admin);
    setAdding(true);
    setForm(next);
    setStart(next);
  };
  const close = () => {
    setAdding(false);
    setEditing(null);
  };
  const [removing, setRemoving] = useState<Admin | null>(null);
  const { pending, run } = useAction();
  const isMe = (email: string) => email.toLowerCase() === me.toLowerCase();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => (editing ? updateAdmin(form) : addAdmin(form)), editing ? "Saved" : "Added to the team")) close();
  };

  const onRemove = async () => {
    if (!removing) return;
    const { email } = removing;
    setRemoving(null);
    await run(() => removeAdmin(email), "Removed from the team", undefined, () => hide(email));
  };

  return (
    <>
      <PageHeader
        icon={Users}
        title="Team"
        description="Everyone who can sign in to this admin. Everyone here can do everything."
        actions={
          <button type="button" onClick={() => open(null)} className={`${button.primary} w-full sm:w-auto`}>
            <Plus className="size-4" /> Add admin
          </button>
        }
      />

      <Toolbar>
        <span className="text-sm text-ink/50">People with access to the Volley CMS.</span>
        <CountPill>
          {admins.length} {admins.length === 1 ? "admin" : "admins"}
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
                    <button
                      type="button"
                      onClick={() => open(a)}
                      className={iconButton}
                      aria-label={`Edit ${a.email}`}
                      title="Change their name or password"
                    >
                      <Edit2 className="size-4" />
                    </button>
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
        onClose={close}
        title={editing ? "Edit admin" : "Add admin"}
        formId="admin-form"
        saveLabel={editing ? "Save" : "Add to team"}
        isSaving={pending}
        dirty={JSON.stringify(form) !== JSON.stringify(start)}
      >
        <form id="admin-form" onSubmit={onSubmit} className="space-y-6">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Email address" hint={editing ? "Their sign-in, which can't be changed here." : undefined}>
            <input
              type="email"
              required
              disabled={Boolean(editing)}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field
            label={editing ? "New password" : "Password"}
            hint={
              editing
                ? "Leave empty to keep their password. A new one needs at least 10 characters; send it to them privately."
                : "At least 10 characters. Send it to them privately."
            }
          >
            <input
              type="text"
              required={!editing}
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
        title="Remove admin"
        message={`Remove ${removing?.email}? They won't be able to sign in here any more.`}
        confirmText="Remove"
        isLoading={pending}
      />
    </>
  );
}
