import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@repfuel.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin1234";

test.describe("Nutrition flow", () => {
  test("login → dieta → UI carga correctamente", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL("**/inicio", { timeout: 15_000 });

    await page.goto("/dieta");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('h3:has-text("Nutrición de hoy")').or(page.locator('text=Resumen del día')).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Calorías').first()).toBeVisible();
  });

  test("objetivos editables", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/inicio", { timeout: 15_000 });

    await page.goto("/dieta/objetivos");
    await expect(page.locator('h1:has-text("Objetivos nutricionales")')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Calorías (kcal)')).toBeVisible();
  });
});