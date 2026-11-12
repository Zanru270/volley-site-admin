import { Empty } from "@/components/ui";

/* Shown where content hasn't been copied into the admin's database yet:
   said for the person using the admin, with the one technical step for
   whoever set it up. */
export default function NotSeeded({ what }: { what: string }) {
  return (
    <Empty>
      The {what} hasn&apos;t been set up here yet, so the website is still showing its built-in version. Ask
      whoever set up the admin to copy the website&apos;s content in: it&apos;s{" "}
      <code className="rounded-md bg-bone px-1.5 py-0.5 text-ink">npm run seed</code>, run once in the admin folder.
    </Empty>
  );
}
