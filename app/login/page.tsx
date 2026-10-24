import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

/* The Bow + Arc CMS's sign-in: a building photo on the left (from lg up),
   the form on the right. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen bg-bone">
      <div className="relative hidden overflow-hidden bg-ink lg:block lg:w-1/2">
        <Image
          src="/login.jpg"
          alt="Volley Brooklyn"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-ink/15" />
        <Image
          src="/Volley-Logo-Small-White.svg"
          alt=""
          width={88}
          height={72}
          className="absolute top-10 left-10 h-12 w-auto"
        />
      </div>

      <div className="relative flex w-full flex-col justify-center px-8 md:px-16 lg:w-1/2 xl:px-32">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-12">
            <h1 className="text-3xl font-normal tracking-tight text-ink">Volley CMS</h1>
            <p className="mt-2 text-sm text-ink/60">Sign in to edit the website.</p>
          </div>
          <LoginForm notAllowed={error === "not-allowed"} />
        </div>
      </div>
    </main>
  );
}
