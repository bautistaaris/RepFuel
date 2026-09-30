/**
 * E2E multi-user: User A and User B isolation.
 * Requires PostgreSQL running (docker compose up -d postgres).
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

async function register(page: Page, name: string, email: string, password: string) {
  await page.goto("/register");
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.locator('button[type="submit"]').click();
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/inicio", { timeout: 15_000 });
}

async function logout(page: Page) {
  await page.goto("/settings");
  await page.getByRole("button", { name: /Cerrar sesión/i }).click();
  await page.waitForURL("**/login", { timeout: 15_000 });
}

async function deleteAccount(page: Page, password: string) {
  await page.goto("/settings");
  await page.locator('input[type="password"]').last().fill(password);
  await page.locator('input').filter({ hasText: "" }).nth(5).fill("ELIMINAR").catch(() => {});
  // Use the actual delete inputs by their stable label
  await page.getByLabel(/^Contraseña$/).last().fill(password);
  await page.getByLabel(/ELIMINAR/).fill("ELIMINAR");
  await page.getByRole("button", { name: /Eliminar mi cuenta/i }).click();
}

test.describe.serial("Multi-user flow", () => {
  const suffix = Date.now();
  const userAEmail = `alice-${suffix}@repfuel.test`;
  const userBEmail = `bob-${suffix}@repfuel.test`;
  const password = "Password123!";

  test("User A registers, logs in, creates data", async ({ page }) => {
    await register(page, "Alice", userAEmail, password);
    await login(page, userAEmail, password);
    await page.goto("/entreno/nueva");
    await page.locator('input').first().fill("PUSH A — Alice");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/entreno\/[a-z0-9]+/);
    await logout(page);
  });

  test("User B registers, logs in, sees empty state (no Alice data)", async ({ page }) => {
    await register(page, "Bob", userBEmail, password);
    await login(page, userBEmail, password);
    await page.goto("/entreno");
    const content = await page.content();
    expect(content).not.toContain("PUSH A — Alice");
    await logout(page);
  });

  test("User A logs back in, still sees own data (no Bob data)", async ({ page }) => {
    await login(page, userAEmail, password);
    await page.goto("/entreno");
    const content = await page.content();
    expect(content).toContain("PUSH A — Alice");
    await logout(page);
  });

  test("User A and User B can share the same routine name without conflict", async ({ page }) => {
    // Bob creates "PUSH B — Bob"
    await login(page, userBEmail, password);
    await page.goto("/entreno/nueva");
    await page.locator('input').first().fill("PUSH A — Alice");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/entreno\/[a-z0-9]+/);

    // Logout, login as Alice — verify her own routine still exists
    await logout(page);
    await login(page, userAEmail, password);
    await page.goto("/entreno");
    const content = await page.content();
    expect(content).toContain("PUSH A — Alice");
  });
});

test.describe("Auth flows", () => {
  const suffix = Date.now();
  const email = `flow-${suffix}@repfuel.test`;
  const password = "Password123!";

  test("register → home (with default empty state)", async ({ page }) => {
    await register(page, "Flow", email, password);
    await login(page, email, password);
    await expect(page).toHaveURL(/\/inicio$/);
  });

  test("forgot password sends reset link (console output)", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=/existe en el sistema/")).toBeVisible({ timeout: 5_000 });
  });

  test("login with wrong password fails", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("WrongPassword!");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=/incorrectas/i")).toBeVisible({ timeout: 5_000 });
  });
});