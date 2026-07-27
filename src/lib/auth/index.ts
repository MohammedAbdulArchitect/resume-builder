import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
// Imported (not just declared) so "bundler" module resolution actually
// loads this subpath export before the ambient augmentation below merges
// into it — a bare `declare module "next-auth/jwt"` alone fails to resolve.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { JWT as _JWT } from "next-auth/jwt";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { upsertAccountOnSignIn } from "@/lib/db/accounts";

declare module "next-auth" {
  interface Session {
    user: {
      accountId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accountId?: string;
  }
}

const providers: Provider[] = [Google];

// Test-only sign-in path so Playwright can exercise the real account-upsert
// code without hitting Google. Gated on an explicit env flag that is never
// set outside the Playwright webServer — never enabled in production.
if (process.env.AUTH_TEST_MODE === "1") {
  providers.push(
    Credentials({
      id: "credentials-test",
      name: "Test Account (dev only)",
      credentials: {},
      async authorize() {
        return {
          id: "test-google-sub",
          email: "playwright@example.com",
          name: "Playwright Test User",
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account) {
        const providerSub = (profile?.sub as string | undefined) ?? user?.id;
        const email = (profile?.email as string | undefined) ?? user?.email ?? "";
        const displayName = (profile?.name as string | undefined) ?? user?.name ?? null;

        if (!providerSub) {
          throw new Error("Sign-in profile is missing a stable subject id");
        }

        const record = await upsertAccountOnSignIn({
          providerSub,
          email,
          displayName,
          locale: "in",
        });
        token.accountId = record.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.accountId) {
        session.user.accountId = token.accountId;
      }
      return session;
    },
  },
});
