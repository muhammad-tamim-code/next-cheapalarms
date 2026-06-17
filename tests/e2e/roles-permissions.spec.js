import { test, expect } from "@playwright/test";

const NAV = { waitUntil: "domcontentloaded", timeout: 60000 };
const VISIBLE = { timeout: 30000 };

test.describe("roles & permissions (unauthenticated)", () => {
  test("admin team redirects to login", async ({ page }) => {
    await page.goto("/admin/team", NAV);
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
  });

  test("roles API rejects unauthenticated requests", async ({ request }) => {
    const response = await request.get("/api/admin/roles");
    expect([401, 403, 500, 502, 503]).toContain(response.status());
    if (response.status() === 401 || response.status() === 403) {
      const body = await response.json();
      expect(body.ok).toBe(false);
    }
  });

  test("create user API rejects unauthenticated requests", async ({ request }) => {
    const response = await request.post("/api/admin/users", {
      data: { email: "smoke-test@example.com", role_key: "customer" },
    });
    expect([401, 403, 500, 502, 503]).toContain(response.status());
    if (response.status() === 401 || response.status() === 403) {
      const body = await response.json();
      expect(body.ok).toBe(false);
    }
  });

  test("role PUT rejects unauthenticated requests", async ({ request }) => {
    const response = await request.put("/api/admin/users/1/role", {
      data: { role_key: "customer" },
    });
    expect([401, 403, 500, 502, 503]).toContain(response.status());
    if (response.status() === 401 || response.status() === 403) {
      const body = await response.json();
      expect(body.ok).toBe(false);
    }
  });
});

test.describe("roles & permissions (authenticated smoke)", () => {
  const ownerEmail = process.env.E2E_OWNER_EMAIL;
  const ownerPassword = process.env.E2E_OWNER_PASSWORD;
  const staffEmail = process.env.E2E_STAFF_EMAIL;
  const staffPassword = process.env.E2E_STAFF_PASSWORD;

  async function login(request, username, password) {
    const response = await request.post("/api/auth/login", {
      data: { username, password },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    return body;
  }

  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD");

  test("owner auth/me includes owner role and settings.manage", async ({ request }) => {
    await login(request, ownerEmail, ownerPassword);
    const me = await request.get("/api/auth/me");
    expect(me.status()).toBe(200);
    const body = await me.json();
    expect(body.ok).toBe(true);
    expect(body.is_admin).toBe(true);
    expect(body.role_key).toBe("owner");
    expect(body.permissions).toContain("settings.manage");
    expect(body.permissions).toContain("data.destructive");
  });

  test("owner can list roles and staff users", async ({ request }) => {
    await login(request, ownerEmail, ownerPassword);
    const roles = await request.get("/api/admin/roles");
    expect(roles.status()).toBe(200);
    const rolesBody = await roles.json();
    expect(rolesBody.ok).toBe(true);
    expect(rolesBody.assignable_roles?.length).toBeGreaterThan(0);

    const staff = await request.get("/api/admin/staff-users");
    expect(staff.status()).toBe(200);
    const staffBody = await staff.json();
    expect(staffBody.ok).toBe(true);
  });

  test.skip(!staffEmail || !staffPassword, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD");

  test("staff auth/me is admin without settings.manage", async ({ request }) => {
    await login(request, staffEmail, staffPassword);
    const me = await request.get("/api/auth/me");
    expect(me.status()).toBe(200);
    const body = await me.json();
    expect(body.ok).toBe(true);
    expect(body.is_admin).toBe(true);
    expect(body.role_key).toBe("staff");
    expect(body.permissions).not.toContain("settings.manage");
    expect(body.permissions).not.toContain("data.destructive");
    expect(body.permissions).toContain("customers.invite");
  });

  test("staff cannot assign roles via API", async ({ request }) => {
    await login(request, staffEmail, staffPassword);
    const response = await request.put("/api/admin/users/1/role", {
      data: { role_key: "customer" },
    });
    expect([401, 403]).toContain(response.status());
  });
});
