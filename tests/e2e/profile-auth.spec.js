import { test, expect } from "@playwright/test";

test.describe("profile page and auth flows", () => {
  test("profile page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/estimates redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/estimates");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/invoices redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/invoices");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/customers redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/customers");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/integrations redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/integrations");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/invites redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/invites");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/logs redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/logs");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/settings redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin/products redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logout API clears session and returns ok", async ({ request }) => {
    const response = await request.post("/api/auth/logout");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  test("GET /api/auth/me returns 401 when not authenticated", async ({ request }) => {
    const response = await request.get("/api/auth/me");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  test("POST /api/auth/me returns 405 method not allowed", async ({ request }) => {
    const response = await request.post("/api/auth/me");
    expect(response.status()).toBe(405);
  });

  test("login page renders branding and form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /cheapalarms/i })).toBeVisible();
    await expect(page.getByPlaceholder("Username")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("quote request success page renders correctly", async ({ page }) => {
    await page.goto("/quote-request/success");
    await expect(page.getByText(/quote request submitted/i)).toBeVisible();
    await expect(page.getByText(/check your email/i).first()).toBeVisible();
  });
});
