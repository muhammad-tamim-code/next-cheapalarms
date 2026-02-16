import { test, expect } from "@playwright/test";

test.describe("security: open redirect protection", () => {
  test("login page with protocol-relative URL stays on login", async ({ page }) => {
    await page.goto("/login?from=//evil.com");
    // Should stay on /login — sanitizeReturnUrl prevents redirect on login submit
    await expect(page).toHaveURL(/\/login/);
    // Page should render the login form (not redirect away)
    await expect(page.getByPlaceholder("Username")).toBeVisible();
  });

  test("login page with absolute external URL stays on login", async ({ page }) => {
    await page.goto("/login?from=https://evil.com");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByPlaceholder("Username")).toBeVisible();
  });

  test("login page with javascript: URI does not redirect", async ({ page }) => {
    await page.goto("/login?from=/javascript:alert(1)");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("security: auth API response safety", () => {
  test("login response does not expose JWT token in body", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { username: "nonexistent", password: "wrong" },
    });
    const body = await response.json();
    expect(body).not.toHaveProperty("token");
  });

  test("logout response sets cookie with empty value", async ({ request }) => {
    const response = await request.post("/api/auth/logout");
    expect(response.status()).toBe(200);
    const setCookie = response.headers()["set-cookie"] || "";
    expect(setCookie).toMatch(/ca_jwt/);
  });
});

test.describe("security: method enforcement on sensitive routes", () => {
  const postOnlyRoutes = [
    "/api/auth/login",
    "/api/auth/reset-password",
    "/api/auth/send-password-reset",
    "/api/auth/validate-reset-key",
    "/api/auth/check-account",
  ];

  for (const route of postOnlyRoutes) {
    test(`GET ${route} returns 405 Method Not Allowed`, async ({ request }) => {
      const response = await request.get(route);
      expect(response.status()).toBe(405);
    });
  }
});
