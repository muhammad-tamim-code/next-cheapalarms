import { test, expect } from "@playwright/test";

/**
 * Single Playwright suite for the Next.js app.
 * Set BASE_URL for production/staging (default http://localhost:3000).
 * Requires the dev server (or deployment) to be running.
 */
// Generous default — Next.js dev server can be slow on cold compile under parallel load
test.setTimeout(60000);
const VISIBLE = { timeout: 30000 };
const NAV = { waitUntil: "domcontentloaded", timeout: 60000 };

test.describe("app", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login", NAV);
    await expect(page.getByRole("heading", { name: /cheapalarms/i })).toBeVisible(VISIBLE);
    await expect(page.getByPlaceholder("Username")).toBeVisible(VISIBLE);
    await expect(page.getByPlaceholder("Password")).toBeVisible(VISIBLE);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible(VISIBLE);
  });

  test("root URL redirects to /login", async ({ page }) => {
    await page.goto("/", NAV);
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
    await expect(page.getByPlaceholder("Username")).toBeVisible(VISIBLE);
  });

  test("quote request page shows form", async ({ page }) => {
    await page.goto("/quote", NAV);
    await expect(page.getByLabel(/first name/i)).toBeVisible(VISIBLE);
    await expect(page.getByLabel(/last name/i)).toBeVisible(VISIBLE);
    await expect(page.getByLabel(/^email$/i)).toBeVisible(VISIBLE);
  });

  test("unauthenticated users are sent to login from dashboard, portal, and admin", async ({ page }) => {
    test.setTimeout(180000);
    for (const path of ["/dashboard", "/portal", "/admin", "/admin/estimates", "/admin/invoices", "/admin/settings", "/admin/team", "/admin/quotes"]) {
      await page.goto(path, NAV);
      await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
    }
  });

  test("set-password without query shows invalid link", async ({ page }) => {
    await page.goto("/set-password", NAV);
    await expect(page.getByText(/invalid link/i)).toBeVisible(VISIBLE);
    await expect(page.getByRole("button", { name: /go to portal/i })).toBeVisible(VISIBLE);
  });

  test("set-password with key shows validating or invalid", async ({ page }) => {
    await page.goto("/set-password?key=testkey123&login=testuser", NAV);
    const validating = page.getByText(/validating reset link/i);
    const invalid = page.getByText(/invalid|expired/i);
    await expect(validating.or(invalid)).toBeVisible(VISIBLE);
  });

  test("portal/estimate without auth redirects to login", async ({ page }) => {
    await page.goto("/portal/estimate/FAKE_ID", NAV);
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
  });

  test("quote success page renders", async ({ page }) => {
    await page.goto("/quote-request/success", NAV);
    await expect(page.getByText(/quote request submitted/i)).toBeVisible(VISIBLE);
  });
});

test.describe("api", () => {
  test("POST /api/auth/login without body returns 400", async ({ request }) => {
    const response = await request.post("/api/auth/login", { data: {} });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  test("GET /api/auth/me without auth returns 401", async ({ request }) => {
    const response = await request.get("/api/auth/me");
    expect(response.status()).toBe(401);
  });

  test("POST /api/auth/logout returns 200 and clears cookie", async ({ request }) => {
    const response = await request.post("/api/auth/logout");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    const setCookie = response.headers()["set-cookie"] || "";
    expect(setCookie).toMatch(/ca_jwt/);
  });

  test("GET /api/auth/login returns 405", async ({ request }) => {
    const response = await request.get("/api/auth/login");
    expect(response.status()).toBe(405);
  });

  test("GET /api/auth/logout returns 405", async ({ request }) => {
    const response = await request.get("/api/auth/logout");
    expect(response.status()).toBe(405);
  });

  test("GET /api/admin/platform without auth is rejected", async ({ request }) => {
    const response = await request.get("/api/admin/platform");
    // 401/403 from WordPress when session missing; 500 if WordPress is unreachable
    expect([401, 403, 500]).toContain(response.status());
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  test("POST /api/admin/quotes/custom-create without auth is rejected", async ({ request }) => {
    const response = await request.post("/api/admin/quotes/custom-create", {
      data: {
        contactDetails: { email: "smoke-test@example.com" },
        items: [{ name: "Test item", amount: 100, qty: 1 }],
        sendNow: false,
      },
    });
    expect([401, 403, 500, 502, 503]).toContain(response.status());
    if (response.status() === 401 || response.status() === 403) {
      const body = await response.json();
      expect(body.ok).toBe(false);
    }
  });

  test("GET /api/stripe/publishable-key returns JSON when WordPress is up", async ({ request }) => {
    const response = await request.get("/api/stripe/publishable-key");
    // 200 when WP responds; 5xx if WordPress is not running in this environment
    expect([200, 500, 502, 503].includes(response.status())).toBe(true);
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("ok");
    }
  });
});

test.describe("security", () => {
  test("login with evil from= keeps user on login", async ({ page }) => {
    await page.goto("/login?from=https://evil.com", NAV);
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
    await expect(page.getByPlaceholder("Username")).toBeVisible(VISIBLE);
  });

  test("failed login response does not include token", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { username: "nonexistent", password: "wrong" },
    });
    const body = await response.json();
    expect(body).not.toHaveProperty("token");
  });
});
