import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

/* The sign-in, in the admin's frame: the form on a white sheet, and from
   lg up a building photo as a rounded panel on the bone canvas beside it. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen gap-3 bg-bone lg:p-3">
      <div className="relative hidden overflow-hidden rounded-2xl bg-ink lg:block lg:w-1/2">
        <Image
          src="/login.jpg"
          alt="Volley Brooklyn"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/50 via-transparent to-ink/20" />
        <Image
          src="/Volley-Logo-Small-White.svg"
          alt=""
          width={88}
          height={100}
          className="absolute top-8 left-8 h-11 w-auto"
        />
        <p className="absolute bottom-8 left-8 font-publish text-2xl text-bone">Volley Brooklyn</p>
      </div>

      <div className="relative flex w-full flex-col justify-center bg-white px-8 md:px-16 lg:w-1/2 lg:rounded-2xl lg:border lg:border-ink/8 xl:px-28">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10">
            <span className="mb-8 flex size-12 items-center justify-center rounded-xl bg-ink">
              <Image src="/Volley-Logo-Small-White.svg" alt="" width={22} height={25} className="h-6 w-auto" />
            </span>
            <h1 className="font-publish text-4xl text-ink">Volley CMS</h1>
            <p className="mt-2 text-sm text-ink/55">Sign in to edit the website.</p>
          </div>
          <LoginForm notAllowed={error === "not-allowed"} />
        </div>
      </div>
    </main>
  );
}
