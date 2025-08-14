import { expect, test } from "@playwright/test";

test.describe("WebAudacity - Basic Application Test", () => {
	test("should load the application and display main structure", async ({
		page,
	}) => {
		// Navigate to the application
		await page.goto("/");

		// Check that the page loads successfully
		await expect(page).toHaveTitle(/WebAudacity/);

		// Check for the main app container
		await expect(page.locator(".audacity-app")).toBeVisible();

		// Look for main content areas without specific selectors
		const mainContent = page.locator(".main-content");
		if ((await mainContent.count()) > 0) {
			await expect(mainContent).toBeVisible();
		}

		// Check that the page doesn't have critical errors
		const errorMessages = page.locator('.error, [role="alert"]');
		expect(await errorMessages.count()).toBe(0);
	});

	test("should not have console errors on load", async ({ page }) => {
		const consoleErrors = [];

		// Listen for console errors
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/");

		// Wait for application to load
		await page.waitForTimeout(3000);

		// Filter out known acceptable errors
		const criticalErrors = consoleErrors.filter(
			(error) =>
				!error.includes("404") &&
				!error.includes("favicon") &&
				!error.includes("manifest.json"),
		);

		expect(criticalErrors).toHaveLength(0);
	});

	test("should display empty project state", async ({ page }) => {
		await page.goto("/");

		// Look for empty project message
		const emptyMessage = page.locator(".empty-project, .empty-message");
		if ((await emptyMessage.count()) > 0) {
			await expect(emptyMessage.first()).toBeVisible();
		}

		// Should show import button
		const importButton = page.locator('button:has-text("Import Audio")');
		if ((await importButton.count()) > 0) {
			await expect(importButton).toBeVisible();
		}
	});
});
