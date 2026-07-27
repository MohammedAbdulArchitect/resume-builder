import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="flex items-center justify-between border-b px-6 py-3 text-sm">
      <Link href="/" className="font-semibold">
        ATS Resume &amp; CV Builder
      </Link>
      {session?.user ? (
        <div className="flex items-center gap-3">
          <Link href="/account" className="text-neutral-600 hover:underline">
            {session.user.email}
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <Link href="/signin">
          <Button size="sm">Sign in</Button>
        </Link>
      )}
    </header>
  );
}
