import { Users } from "lucide-react";
import { PageHeader, Toolbar, tableHead, tableWrap, tbody, td, th } from "@/components/ui";
import { Bone, buttonBone, SkeletonPage } from "@/components/Skeleton";

// The team while it loads: the admins' table, three rows of it.
export default function Loading() {
  return (
    <SkeletonPage>
      <PageHeader
        icon={Users}
        title="Team"
        description="Everyone who can sign in to this admin. Everyone here can do everything."
        actions={<Bone className={`${buttonBone} w-full sm:w-32`} />}
      />
      <Toolbar>
        <span className="text-sm text-ink/50">People with access to the Volley CMS.</span>
        <Bone className="h-6 w-20 rounded-full" />
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
            {Array.from({ length: 3 }, (_, i) => (
              <tr key={i}>
                <td className={td}>
                  <div className="flex items-center gap-4">
                    <Bone className="size-10 shrink-0 rounded-full" />
                    <div className="space-y-2">
                      <Bone className="h-4 w-36" />
                      <Bone className="h-3 w-48" />
                    </div>
                  </div>
                </td>
                <td className={td}>
                  <Bone className="h-4 w-24" />
                </td>
                <td className={td}>
                  <div className="flex justify-end gap-1">
                    <Bone className="size-8 rounded-lg" />
                    <Bone className="size-8 rounded-lg" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SkeletonPage>
  );
}
