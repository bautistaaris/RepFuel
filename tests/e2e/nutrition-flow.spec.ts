import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@repfuel.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin1234";

test.describe("Nutrition flow", () => {
  test("login → dieta → agregar comida → guardar", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/inicio", { timeout: 10_000 });

    await page.goto("/dieta");
    await page.waitForLoadState("networkidle");

    const addBtn = page.locator('button:has-text("Agregar")').first();
    await addBtn.click();

    await page.locator('input').first().fill("E2E Test Food");
    const numericInputs = page.locator('input[inputmode="decimal"]');
    const numericCount = await numericInputs.count();
    if (numericCount > 0) {
      await numericInputs.nth(0).fill("100");
    }
    if (numericCount > 1) {
      await numericInputs.nth(1).fill("200");
    }

    const saveBtn = page.locator('button:has-text("Guardar")').first();
    await saveBtn.click();

    await page.waitForLoadState("networkidle");
    await expect(page.locator('text=E2E Test Food').first()).toBeVisible({ timeout: 10_000 });
  });
});