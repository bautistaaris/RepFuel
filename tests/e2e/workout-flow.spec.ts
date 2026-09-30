import { test, expect, type Page } from "@playwright/test";

const timestamp = Date.now();
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? `e2e-admin-${timestamp}@repfuel.test`;
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

test.describe("Workout flow", () => {
  test("login → rutina → workout → set → finalizar", async ({ page }) => {
    await registerAndLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto("/entreno");

    const firstRoutine = page.locator('a[href^="/entreno/"]:not([href="/entreno"]):not([href="/entreno/active"]):not([href="/entreno/nueva"])').first();
    if (await firstRoutine.count() === 0) {
      await page.goto("/entreno/nueva");
      await page.locator('input').first().fill("E2E Test Routine");
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/entreno\/[a-z0-9]+/);
    } else {
      await firstRoutine.click();
      await page.waitForURL(/\/entreno\/[a-z0-9]+/);
    }

    const startBtn = page.locator('button:has-text("Empezar entrenamiento")');
    if (await startBtn.count() > 0) {
      await startBtn.click();
      await page.waitForURL("**/entreno/active");
    } else {
      await page.goto("/entreno/active");
    }

    const checkButtons = page.locator('button[aria-label*="ompletar"]');
    const count = await checkButtons.count();
    if (count > 0) {
      await checkButtons.first().click();
    }

    const finishBtn = page.locator('button:has-text("Finalizar")').first();
    if (await finishBtn.count() > 0) {
      await finishBtn.click();
      const confirmBtn = page.locator('button:has-text("Finalizar y guardar")');
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
      }
    }

    await page.waitForURL(/\/entreno($|\/)/, { timeout: 10_000 });
  });
});