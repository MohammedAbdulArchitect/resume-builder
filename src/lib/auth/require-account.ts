import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// DAL-style auth check used close to the data it guards (Next.js's own
// recommendation) rather than global proxy/middleware — see Phase 2 plan
// notes on the middleware -> proxy rename in Next.js 16.
export async function requireAccount(): Promise<{ accountId: string; email: string | null }> {
  const session = await auth();
  const accountId = session?.user?.accountId;

  if (!accountId) {
    redirect("/signin");
  }

  return { accountId, email: session.user?.email ?? null };
}
