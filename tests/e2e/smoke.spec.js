import { test, expect } from "@playwright/test";

test.describe("headless surface smoke test", () => {
  // --- Login page ---

  test("login page renders branding and form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /cheapalarms/i })).toBeVisible();
    await expect(page.getByPlaceholder("Username")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  // --- Auth guards (pages that redirect to login when unauthenticated) ---

  test("dashboard redirects unauthenticated visitors to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("portal without estimateId redirects unauthenticated visitors", async ({ page }) => {
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/login/);
  });

  // --- Set Password page ---

  test("set-password page without query params shows invalid link message", async ({ page }) => {
    await page.goto("/set-password");
    await expect(page.getByText(/invalid link/i)).toBeVisible();
    await expect(page.getByText(/password reset link is invalid or has expired/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /go to portal/i })).toBeVisible();
  });

  test("set-password page with key and login shows validating state", async ({ page }) => {
    await page.goto("/set-password?key=testkey123&login=testuser");
    const validating = page.getByText(/validating reset link/i);
    const invalid = page.getByText(/invalid|expired/i);
    await expect(validating.or(invalid)).toBeVisible();
  });

  // --- Portal dynamic route ---

  test("portal/estimate/[id] without auth redirects to login", async ({ page }) => {
    await page.goto("/portal/estimate/FAKE_ID");
    // Should redirect unauthenticated users to login
    await expect(page).toHaveURL(/\/login/);
  });

  // --- Static pages render without crash ---

  test("home page renders without errors", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toHaveText(/application error/i);
  });

  test("quote request success page renders", async ({ page }) => {
    await page.goto("/quote-request/success");
    await expect(page.getByText(/quote request submitted/i)).toBeVisible();
  });

  test("paradox-magellan product page renders", async ({ page }) => {
    await page.goto("/paradox-magellan");
    await expect(page.locator("body")).not.toHaveText(/application error/i);
  });

  test("paradox-magellan calculator renders", async ({ page }) => {
    await page.goto("/paradox-magellan/calculator");
    await expect(page.locator("body")).not.toHaveText(/application error/i);
  });
});

/**
 * Tests below require a running WordPress backend with mock data.
 * They test portal UI navigation and content rendering.
 * Skip when running without WordPress (CI/local dev without backend).
 *
 * To run: set ENABLE_WP_TESTS=1 and ensure WordPress is available.
 */
const wpTest = process.env.ENABLE_WP_TESTS ? test : test.skip;

test.describe("portal mock mode (requires WordPress)", () => {
  wpTest("portal mock renders overview with estimate data", async ({ page }) => {
    await page.goto("/portal?estimateId=TEST&locationId=LOC&__mock=1");
    await expect(page.getByText(/your estimate/i)).toBeVisible();
  });

  wpTest("portal navigates to payments view", async ({ page }) => {
    await page.goto("/portal?estimateId=TEST&locationId=LOC&__mock=1");
    await page.getByRole("button", { name: /payments/i }).click();
    await expect(page.getByText(/financial overview/i)).toBeVisible();
  });

  wpTest("portal navigates to support view", async ({ page }) => {
    await page.goto("/portal?estimateId=TEST&locationId=LOC&__mock=1");
    await page.getByRole("button", { name: /support/i }).click();
    await expect(page.getByText(/customer care/i)).toBeVisible();
  });

  wpTest("portal navigates to preferences view", async ({ page }) => {
    await page.goto("/portal?estimateId=TEST&locationId=LOC&__mock=1");
    await page.getByRole("button", { name: /preferences/i }).click();
    await expect(page.getByText(/your account/i)).toBeVisible();
  });

  wpTest("portal shows guest access banner", async ({ page }) => {
    await page.goto("/portal?estimateId=TEST&inviteToken=abc123&__mock=1");
    await expect(page.getByText(/viewing as guest/i)).toBeVisible();
  });

  wpTest("dashboard mock shows portal actions", async ({ page }) => {
    await page.goto("/dashboard?__mock=1");
    await expect(page.getByText(/open portal/i).first()).toBeVisible();
  });
});
