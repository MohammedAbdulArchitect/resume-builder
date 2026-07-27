import path from "node:path";
import { test, expect } from "@playwright/test";

// Shares the fixed "test-google-sub" credentials-test account with
// auth.spec.ts — cleaned up once in tests/e2e/global-teardown.ts.

test("upload a resume, edit a field, watch the ATS score update, and save", async ({ page }) => {
  // Generous overall timeout: /api/parse pulls in pdf-parse + mammoth,
  // which can take a while to compile on first hit under dev-mode Turbopack.
  test.setTimeout(90_000);

  await page.goto("/signin");
  await page.getByRole("button", { name: "Sign in with Test Account (dev only)" }).click();
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });

  await page.goto("/upload");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "fixtures", "fresher-it.txt"));

  await expect(page).toHaveURL(/\/review\//, { timeout: 60_000 });
  await expect(page.getByLabel("Full name")).toHaveValue("Ananya Sharma");

  const scoreBefore = await page.getByTestId("ats-score").textContent();
  expect(scoreBefore).toBe("100/100");

  // Editing the email to include markup flips contactAsPlainText false,
  // which should visibly move the ATS score.
  const email = page.getByLabel("Email");
  await email.fill("<script>@example.com");
  await expect(page.getByTestId("ats-score")).toHaveText("85/100");

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
});
