import path from "node:path";
import { test, expect } from "@playwright/test";

// Shares the fixed "test-google-sub" credentials-test account with
// auth.spec.ts / upload-review.spec.ts — cleaned up once in
// tests/e2e/global-teardown.ts.

const TEMPLATE_NAMES = [
  "ATS Plain",
  "Modern Clean",
  "Professional",
  "Compact",
  "Fresher Focus",
  "Executive",
  "Academic CV",
  "Two-Column",
];

test("select each template and download a PDF; download a DOCX once", async ({ page }) => {
  // Generous overall timeout: PDF rendering + the post-export ATS
  // re-extraction assertion runs once per download, across all 8 templates.
  test.setTimeout(180_000);

  await page.goto("/signin");
  await page.getByRole("button", { name: "Sign in with Test Account (dev only)" }).click();
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });

  await page.goto("/upload");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "fixtures", "fresher-it.txt"));
  await expect(page).toHaveURL(/\/review\//, { timeout: 60_000 });

  await page.getByRole("link", { name: "Choose template" }).click();
  await expect(page).toHaveURL(/\/template\//, { timeout: 20_000 });

  for (const name of TEMPLATE_NAMES) {
    await page.getByRole("button", { name, exact: true }).click();

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      page.getByRole("button", { name: "Download PDF" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/_Resume\.pdf$/);
  }

  const [docxDownload] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    page.getByRole("button", { name: "Download DOCX" }).click(),
  ]);
  expect(docxDownload.suggestedFilename()).toMatch(/_Resume\.docx$/);
});
