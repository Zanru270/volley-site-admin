import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/* Runs before every page: refreshes the Supabase session cookie, and sends
   anyone who isn't signed in to /login. Whether a signed-in user is
   actually an admin is checked by requireAdmin() in the dashboard layout,
   and again by the database on every read and write.

   getClaims(), not getUser(): it checks the login's signature here, with
   the project's public signing key (fetched once and kept in memory),
   instead of asking Supabase's servers on every request. getUser() did,
   and on every page, click and save that round trip (and any hiccup on
   it) came first. Supabase is only called when the login needs
   refreshing, about once an hour. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub;

  if (!user && request.nextUrl.pathname !== "/login") {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    // Keep any refreshed or cleared session cookies.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  // Everything but Next's own files and static images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
