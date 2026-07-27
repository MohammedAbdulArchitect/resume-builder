import { test, expect } from "@playwright/test";

test("template preview renders resume content in the DOM", async ({ page }) => {
  await page.goto("/template/preview");

  await expect(page.getByText("Marcus Webb")).toBeVisible();
  await expect(page.getByText(/Redwood Retail Group/).first()).toBeVisible();
  await expect(page.getByText(/Operations Manager/).first()).toBeVisible();
});
