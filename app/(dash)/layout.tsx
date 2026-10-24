import { requireAdmin } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastProvider";

/* The Bow + Arc CMS's frame: the fixed sidebar, and the page on bone
   beside it. Every page under here can raise toasts. */
export default async function DashboardLayout({
  children,
}: LayoutProps<"/">) {
  const { user } = await requireAdmin();
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-bone">
        <Sidebar
          email={user.email ?? ""}
          siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
        />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden md:ml-64">
          <main className="flex-1 px-4 pt-22 pb-20 md:p-12 xl:p-16">
            <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
