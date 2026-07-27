import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-16 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-neutral-600">Google sign-in is required before any resume action.</p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/account" });
        }}
      >
        <Button type="submit">Sign in with Google</Button>
      </form>

      {process.env.AUTH_TEST_MODE === "1" ? (
        <form
          action={async () => {
            "use server";
            await signIn("credentials-test", { redirectTo: "/account" });
          }}
        >
          <Button type="submit" variant="outline">
            Sign in with Test Account (dev only)
          </Button>
        </form>
      ) : null}
    </main>
  );
}
