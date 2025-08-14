import { expect, test } from "@playwright/test";

test.describe("WebAudacity - Menu Bar Functionality", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// Wait for the application to load
		await expect(
			page.locator('[data-testid="menu-bar"], .menu-bar'),
		).toBeVisible();
	});

	test("should display all menu items", async ({ page }) => {
		// Check that all main menu items are present
		const expectedMenuItems = [
			"file",
			"edit", 
			"generate",
			"effect",
			"analyze",
			"tools",
			"help",
		];

		for (const menuItem of expectedMenuItems) {
			await expect(page.locator(`[data-testid="menu-item-${menuItem}"]`)).toBeVisible();
		}
	});

	test("should open and close File menu", async ({ page }) => {
		const fileMenuItem = page.locator('[data-testid="menu-item-file"]');

		// Click to open the File menu
		await fileMenuItem.click();

		// Verify menu is open (check for dropdown)
		await expect(page.locator('[data-testid="dropdown-file"]')).toBeVisible();
		await expect(page.locator('[data-testid="menu-item-import->-audio..."]')).toBeVisible();
		await expect(page.locator('[data-testid="menu-item-export-audio..."]')).toBeVisible();

		// Close menu by clicking the menu item again (toggle)
		await fileMenuItem.click();

		// Verify menu is closed
		await expect(page.locator('[data-testid="dropdown-file"]')).not.toBeVisible();
	});

	test("should open and close Edit menu", async ({ page }) => {
		const editMenuItem = page.locator('[data-testid="menu-item-edit"]');

		await editMenuItem.click();

		// Check for dropdown and common edit menu items
		await expect(page.locator('[data-testid="dropdown-edit"]')).toBeVisible();
		await expect(page.locator('[data-testid="menu-item-undo"]')).toBeVisible();
		await expect(page.locator('[data-testid="menu-item-redo"]')).toBeVisible();

		await page.keyboard.press("Escape");
	});

	test("should open and close Generate menu", async ({ page }) => {
		const generateMenuItem = page.locator('[data-testid="menu-item-generate"]');

		await generateMenuItem.click();

		// Check for dropdown and common generate menu items
		await expect(page.locator('[data-testid="dropdown-generate"]')).toBeVisible();
		await expect(page.locator('[data-testid="menu-item-tone..."]')).toBeVisible();
		await expect(page.locator('[data-testid="menu-item-noise..."]')).toBeVisible();

		await page.keyboard.press("Escape");
	});

	test("should open and close Effect menu", async ({ page }) => {
		const effectMenuItem = page.locator('[data-testid="menu-item-effect"]');

		await effectMenuItem.click();

		// Check for dropdown and common effect menu items
		await expect(page.locator('[data-testid="dropdown-effect"]')).toBeVisible();
		await expect(page.locator('[data-testid="menu-item-amplify..."]')).toBeVisible();
		await expect(page.locator('[data-testid="menu-item-normalize..."]')).toBeVisible();

		await page.keyboard.press("Escape");
	});

	test("should open and close Help menu", async ({ page }) => {
		const helpMenuItem = page.locator('[data-testid="menu-item-help"]');

		await helpMenuItem.click();

		// Check for dropdown and help menu items
		await expect(page.locator('[data-testid="dropdown-help"]')).toBeVisible();
		await expect(page.locator('[data-testid="menu-item-about-webaudacity"]')).toBeVisible();

		await page.keyboard.press("Escape");
	});
});
