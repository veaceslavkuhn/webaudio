import { expect, test } from "@playwright/test";

test.describe("WebAudacity - Modal Dialogs", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await expect(
			page.locator('[data-testid="menu-bar"], .menu-bar'),
		).toBeVisible();
	});

	test("should open and close About modal", async ({ page }) => {
		// Open Help menu by clicking on the menu item
		await page.locator('[data-testid="menu-item-help"]').click();

		// Click About in the dropdown
		await page.locator('[data-testid="menu-item-about-webaudacity"]').click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="about-modal-content"]'),
		).toBeVisible();

		// Close modal using the close button
		await page.locator('[data-testid="about-close-button"]').click();

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="about-modal-content"]'),
		).not.toBeVisible();
	});

	test("should open and close File modal", async ({ page }) => {
		// Open File menu by clicking on the menu item
		await page.locator('[data-testid="menu-item-file"]').click();

		// Click Import in the dropdown
		await page.locator('[data-testid="menu-item-import->-audio..."]').click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="file-modal-content"]'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="file-modal-content"]'),
		).not.toBeVisible();
	});

	test("should open and close Export modal", async ({ page }) => {
		// Open File menu by clicking on the menu item
		await page.locator('[data-testid="menu-item-file"]').click();

		// Click Export in the dropdown
		await page.locator('[data-testid="menu-item-export-audio..."]').click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="export-modal-content"]'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="export-modal-content"]'),
		).not.toBeVisible();
	});

	test("should open and close Generate modal", async ({ page }) => {
		// Open Generate menu by clicking on the menu item
		await page.locator('[data-testid="menu-item-generate"]').click();

		// Click on a generate option (e.g., Tone)
		await page.locator('[data-testid="menu-item-tone..."]').click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="generate-modal"]'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="generate-modal"]'),
		).not.toBeVisible();
	});

	test("should open and close Effect modal", async ({ page }) => {
		// Open Effect menu by clicking on the menu item
		await page.locator('[data-testid="menu-item-effect"]').click();

		// Click on an effect option (e.g., Amplify)
		await page.locator('[data-testid="menu-item-amplify..."]').click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="effect-modal"]'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="effect-modal"]'),
		).not.toBeVisible();
	});

	test("should open and close Preferences modal", async ({ page }) => {
		// Open Tools menu by clicking on the menu item
		await page.locator('[data-testid="menu-item-tools"]').click();

		// Click Preferences
		await page.locator('[data-testid="menu-item-preferences..."]').click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="preferences-modal-content"]'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="preferences-modal-content"]'),
		).not.toBeVisible();
	});

	test("should handle modal overlay clicks", async ({ page }) => {
		// Open any modal - use Help > About
		await page.locator('[data-testid="menu-item-help"]').click();
		await page.locator('[data-testid="menu-item-about-webaudacity"]').click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="about-modal-content"]'),
		).toBeVisible();

		// Click on overlay (outside modal content)
		await page.locator('[data-testid="modal-overlay"]').click({ position: { x: 10, y: 10 } });

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="about-modal-content"]'),
		).not.toBeVisible();
	});
});
