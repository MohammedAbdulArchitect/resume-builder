import { test, expect } from "@playwright/test";
import { deleteAccount, getAccountByGoogleSub } from "@/lib/db/accounts";

const TEST_GOOGLE_SUB = "test-google-sub";

test("unauthenticated visit to /account redirects to /signin", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/signin/);
});

test("test sign-in flow reaches an authenticated page", async ({ page }) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Sign in with Test Account (dev only)" }).click();

  // Generous timeout: first visit to /account triggers on-demand dev-mode
  // route compilation on top of the real DB round trip.
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
  await expect(page.getByText("playwright@example.com").first()).toBeVisible();
});

test.afterAll(async () => {
  // The credentials-test provider always upserts the same fixed account —
  // clean it up so repeated runs don't leave a permanent DB row behind.
  const account = await getAccountByGoogleSub(TEST_GOOGLE_SUB);
  if (account) await deleteAccount(account.id);
});
