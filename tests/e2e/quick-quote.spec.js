import { test, expect } from "@playwright/test";

const NAV = { waitUntil: "domcontentloaded", timeout: 60000 };
const VISIBLE = { timeout: 30000 };

test.describe("quick quote (unauthenticated)", () => {
  test("admin quotes index redirects to login", async ({ page }) => {
    await page.goto("/admin/quotes", NAV);
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
  });

  test("admin quotes new redirects to login", async ({ page }) => {
    await page.goto("/admin/quotes/new", NAV);
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
  });
});

test.describe("quick quote (authenticated smoke)", () => {
  const ownerEmail = process.env.E2E_OWNER_EMAIL;
  const ownerPassword = process.env.E2E_OWNER_PASSWORD;

  async function loginAsOwner(page) {
    await page.goto("/login", NAV);
    await page.getByPlaceholder("Username").fill(ownerEmail);
    await page.getByPlaceholder("Password").fill(ownerPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
  }

  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD");

  test("owner can open quick quote chooser and create wizard", async ({ page }) => {
    await loginAsOwner(page);

    await page.goto("/admin/quotes", NAV);
    await expect(page.getByRole("heading", { name: /quick quote/i })).toBeVisible(VISIBLE);
    await expect(page.getByRole("link", { name: /new quote/i })).toBeVisible(VISIBLE);

    await page.getByRole("link", { name: /new quote/i }).click();
    await expect(page).toHaveURL(/\/admin\/quotes\/new/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /line items/i })).toBeVisible(VISIBLE);
    await expect(page.getByRole("button", { name: /add item/i })).toBeVisible(VISIBLE);
  });
});
