import { expect, test } from "@playwright/test";

test.describe("WebAudacity - Application Loading & Initialization", () => {
	test("should load the application without errors", async ({ page }) => {
		// Navigate to the application
		await page.goto("/");

		// Check that the page loads successfully
		await expect(page).toHaveTitle(/WebAudacity/);

		// Verify main UI components are visible
		await expect(
			page.locator('[data-testid="menu-bar"], .menu-bar'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="toolbar"], .toolbar'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="timeline"], .timeline'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="track-panel"], .track-panel'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="status-bar"], .status-bar'),
		).toBeVisible();
	});

	test("should not have console errors on initial load", async ({ page }) => {
		const consoleErrors = [];

		// Listen for console errors
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/");

		// Wait a bit for any delayed errors
		await page.waitForTimeout(2000);

		// Check that there are no console errors
		expect(consoleErrors).toHaveLength(0);
	});

	test("should have proper page structure", async ({ page }) => {
		await page.goto("/");

		// Check that the root element exists
		await expect(page.locator("#root")).toBeVisible();

		// Check that the main app container is present
		const appContainer = page.locator("#root > *").first();
		await expect(appContainer).toBeVisible();
	});
});
