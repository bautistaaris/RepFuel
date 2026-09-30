import { test, expect, type Page } from "@playwright/test";

const timestamp = Date.now();
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? `e2e-nut-${timestamp}@repfuel.test`;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin1234!";

async function registerAndLogin(page: Page, email: string, password: string) {
  await page.goto("/register");
  await page.locator('input[name="name"]').fill("E2E User");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/inicio", { timeout: 15_000 });
}

test.describe("Nutrition flow", () => {
  test("login → dieta → UI carga correctamente", async ({ page }) => {
    await registerAndLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto("/dieta");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('h3:has-text("Nutrición de hoy")').or(page.locator('text=Resumen del día')).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Calorías').first()).toBeVisible();
  });

  test("objetivos editables", async ({ page }) => {
    await registerAndLogin(page, `e2e-nut2-${timestamp}@repfuel.test`, ADMIN_PASSWORD);
    await page.goto("/dieta/objetivos");
    await expect(page.locator('h1:has-text("Objetivos nutricionales")')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Calorías (kcal)')).toBeVisible();
  });
});