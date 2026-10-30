import { requireAdmin } from "@/lib/auth";
import Frame from "@/components/Frame";
import { ToastProvider } from "@/components/ToastProvider";

/* The admin's frame (sidebar, top bar, the page's white sheet) around
   every signed-in page. Every page under here can raise toasts. */
export default async function DashboardLayout({
  children,
}: LayoutProps<"/">) {
  const { supabase, user } = await requireAdmin();
  const email = user.email ?? "";
  const { data: me } = await supabase
    .from("admin_users")
    .select("name")
    .eq("email", email)
    .maybeSingle();
  return (
    <ToastProvider>
      <Frame
        name={me?.name ?? ""}
        email={email}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
      >
        {children}
      </Frame>
    </ToastProvider>
  );
}
