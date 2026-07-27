import { test, expect } from "@playwright/test";

// The credentials-test provider always upserts the same fixed
// "test-google-sub" account, shared with upload-review.spec.ts — cleaned up
// once in tests/e2e/global-teardown.ts, not per-file (per-file cleanup here
// would race the other spec file still using that same account).

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
