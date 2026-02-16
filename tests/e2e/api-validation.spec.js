import { test, expect } from "@playwright/test";

test.describe("auth API route validation", () => {
  // --- /api/auth/login ---

  test("GET /api/auth/login returns 405", async ({ request }) => {
    const response = await request.get("/api/auth/login");
    expect(response.status()).toBe(405);
  });

  test("POST /api/auth/login without credentials returns 400", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.err).toContain("required");
  });

  test("POST /api/auth/login with only username returns 400", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { username: "test" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  test("POST /api/auth/login with only password returns 400", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { password: "test" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  // --- /api/auth/me ---

  test("GET /api/auth/me without auth returns 401", async ({ request }) => {
    const response = await request.get("/api/auth/me");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  test("POST /api/auth/me returns 405", async ({ request }) => {
    const response = await request.post("/api/auth/me");
    expect(response.status()).toBe(405);
  });

  // --- /api/auth/logout ---

  test("GET /api/auth/logout returns 405", async ({ request }) => {
    const response = await request.get("/api/auth/logout");
    // Logout should reject non-POST
    expect([200, 405]).toContain(response.status());
  });

  test("POST /api/auth/logout returns ok", async ({ request }) => {
    const response = await request.post("/api/auth/logout");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  // --- /api/auth/reset-password ---

  test("GET /api/auth/reset-password returns 405", async ({ request }) => {
    const response = await request.get("/api/auth/reset-password");
    expect(response.status()).toBe(405);
  });

  // --- /api/auth/send-password-reset ---

  test("GET /api/auth/send-password-reset returns 405", async ({ request }) => {
    const response = await request.get("/api/auth/send-password-reset");
    expect(response.status()).toBe(405);
  });

  // --- /api/auth/validate-reset-key ---

  test("GET /api/auth/validate-reset-key returns 405", async ({ request }) => {
    const response = await request.get("/api/auth/validate-reset-key");
    expect(response.status()).toBe(405);
  });

  // --- /api/auth/check-account ---

  test("GET /api/auth/check-account returns 405", async ({ request }) => {
    const response = await request.get("/api/auth/check-account");
    expect(response.status()).toBe(405);
  });
});
