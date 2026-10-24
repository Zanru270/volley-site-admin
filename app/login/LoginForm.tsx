"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { button, Field, inputClass } from "@/components/ui";

export default function LoginForm({ notAllowed }: { notAllowed: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    notAllowed
      ? "That login isn't on the admin list. Ask an admin to add you on the Team page."
      : "",
  );

  // Signed in, but not an admin: sign out so they can try another login.
  useEffect(() => {
    if (notAllowed) createClient().auth.signOut();
  }, [notAllowed]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-sm border border-brick/20 bg-pink/20 p-4 text-sm text-brick"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Field label="Email Address">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClass} py-3!`}
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputClass} py-3!`}
        />
      </Field>
      <button
        type="submit"
        disabled={busy}
        className={`${button.primary} mt-8! w-full py-4! active:scale-[0.98]`}
      >
        {busy ? (
          <>
            <Loader2 className="size-4.5 animate-spin" /> Signing in…
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}
