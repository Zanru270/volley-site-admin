import { SectionTitle, tableHead, th, td } from "@/components/ui";
import { Bone, SkeletonPage } from "@/components/Skeleton";

/* The dashboard while it loads: the welcome panel (its lemon glow and all)
   with the banner and the four counts, the Volley Reader strip, then the
   buildings beside this week's viewing times. */
export default function Loading() {
  return (
    <SkeletonPage className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-ink/8 bg-bone/40 p-5 md:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-40 size-[34rem] rounded-full bg-[radial-gradient(closest-side,var(--color-lemon),transparent)] opacity-80"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-5">
            <Bone className="size-18 shrink-0 rounded-full bg-white!" />
            <div className="space-y-2">
              <Bone className="h-9 w-64 md:h-11 md:w-80" />
              <Bone className="h-4 w-56" />
            </div>
          </div>
          <div className="flex gap-2">
            <Bone className="h-10 w-28 rounded-lg" />
            <Bone className="h-10 w-36 rounded-lg" />
          </div>
        </div>
        <Bone className="relative mt-6 h-13 rounded-xl bg-white/80!" />
        <div className="relative mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-xl border border-ink/5 bg-white p-4 shadow-soft">
              <Bone className="h-4 w-24" />
              <Bone className="mt-3 h-7 w-10" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Volley Reader</SectionTitle>
        <div className="-mx-4 flex gap-4 overflow-hidden px-4 pb-2 md:mx-0 md:px-0">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white sm:w-80">
              <div className="flex items-start gap-3 p-4">
                <Bone className="size-10 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1 space-y-2">
                  <Bone className="h-4 w-4/5" />
                  <Bone className="h-3 w-1/2" />
                </span>
                <Bone className="h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-2 px-4">
                <Bone className="h-3.5 w-full" />
                <Bone className="h-3.5 w-3/4" />
              </div>
              <div className="mt-4 flex gap-2 bg-bone/30 px-4 py-3">
                <Bone className="h-6 w-20 bg-white!" />
                <Bone className="h-6 w-16 bg-white!" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="min-w-0">
          <SectionTitle>Buildings</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white p-2 md:p-3">
            <table className="w-full text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Building</th>
                  <th className={th}>Room types</th>
                  <th className={th}>Last edited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Bone className="size-8 shrink-0 rounded-lg" />
                        <span className="space-y-1.5">
                          <Bone className="h-4 w-32" />
                          <Bone className="h-3 w-44" />
                        </span>
                      </div>
                    </td>
                    <td className={td}>
                      <Bone className="h-4 w-14" />
                    </td>
                    <td className={td}>
                      <Bone className="h-4 w-20" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0">
          <SectionTitle>Viewing times</SectionTitle>
          <div className="rounded-2xl border border-ink/10 bg-white p-4">
            <Bone className="h-9 rounded-xl" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-ink/8 px-3 py-2.5">
                  <Bone className="size-4 shrink-0 rounded-full" />
                  <span className="flex-1 space-y-1.5">
                    <Bone className="h-4 w-24" />
                    <Bone className="h-3 w-32" />
                  </span>
                </div>
              ))}
            </div>
            <Bone className="mx-auto mt-3 h-4 w-28" />
          </div>
        </section>
      </div>
    </SkeletonPage>
  );
}
