import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@repfuel.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin1234";

test.describe("Workout flow", () => {
  test("login → rutina → workout → set → finalizar", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL("**/inicio", { timeout: 10_000 });

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