import { Empty } from "@/components/ui";

// Shown where content hasn't been copied into Supabase yet.
export default function NotSeeded({ what }: { what: string }) {
  return (
    <Empty>
      There&apos;s no {what} in Supabase yet, so the website is still showing
      its built-in copy. Run{" "}
      <code className="rounded-sm bg-bone px-1.5 py-0.5 text-ink">npm run seed</code>{" "}
      in the admin folder once to copy the website&apos;s current content in.
    </Empty>
  );
}
