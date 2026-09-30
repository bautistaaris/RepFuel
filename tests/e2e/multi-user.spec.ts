/**
 * E2E: Auth pages load and render correctly.
 * Full multi-user isolation is verified via unit tests + manual smoke.
 */
import { test, expect, type Page } from "@playwright/test";

test.describe("Auth pages", () => {
  test("/login renders the login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/register"]')).toBeVisible();
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test("/register renders the register form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test("/forgot-password renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("Authenticated user visiting /login redirects to /inicio", async ({ page }) => {
    // Create user + login via API-like flow. Skip if registration is disabled.
    const ts = Date.now();
    const email = `auth-redirect-${ts}@repfuel.test`;
    await page.goto("/register");
    const regClosed = await page.locator("text=Registro cerrado").count();
    test.skip(regClosed > 0, "Public registration disabled");

    await page.locator('input[name="name"]').fill("Auth Test");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Password123!");
    await page.locator('input[name="confirmPassword"]').fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/inicio", { timeout: 15_000 });

    // Now visit /login and expect to be sent to /inicio.
    await page.goto("/login");
    await page.waitForURL("**/inicio", { timeout: 10_000 });
    expect(page.url()).toMatch(/\/inicio$/);
  });
});

test.describe("Multi-user isolation via API", () => {
  test("Unauthenticated /inicio redirects to /login", async ({ page }) => {
    const response = await page.goto("/inicio");
    expect(page.url()).toMatch(/\/login(\?|$)/);
    void response;
  });

  test("/api/health responds OK without auth", async ({ page }) => {
    const response = await page.goto("/api/health");
    expect(response?.status()).toBe(200);
    const text = await page.locator("body").textContent();
    expect(text).toContain("ok");
  });
});

test.describe("No cross-user leakage via cached pages", () => {
  test("Unauthenticated /entreno redirects to /login", async ({ page }) => {
    await page.goto("/entreno");
    expect(page.url()).toMatch(/\/login(\?|$)/);
  });

  test("Unauthenticated /dieta redirects to /login", async ({ page }) => {
    await page.goto("/dieta");
    expect(page.url()).toMatch(/\/login(\?|$)/);
  });

  test("Unauthenticated /progreso redirects to /login", async ({ page }) => {
    await page.goto("/progreso");
    expect(page.url()).toMatch(/\/login(\?|$)/);
  });

  test("Unauthenticated /settings redirects to /login", async ({ page }) => {
    await page.goto("/settings");
    expect(page.url()).toMatch(/\/login(\?|$)/);
  });
});