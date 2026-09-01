import { expect, test } from "@playwright/test";

test("landing page invites sign in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /sign in with discord/i }),
  ).toBeVisible();
});

test("protected routes redirect to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/signin/);
  await expect(
    page.getByRole("button", { name: /continue with discord/i }),
  ).toBeVisible();
});
