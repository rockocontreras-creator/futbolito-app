import { expect, test } from "@playwright/test";

test("la portada invita a sumarse a una pichanga", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "¿Te sumas a la pichanga?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Buscar pichanga/ })).toBeVisible();
});
