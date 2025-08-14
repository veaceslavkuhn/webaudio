import { expect, test } from "@playwright/test";

test.describe("WebAudacity - Modal Dialogs", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await expect(
			page.locator('[data-testid="menu-bar"], .menu-bar'),
		).toBeVisible();
	});

	test("should open and close About modal", async ({ page }) => {
		// Open Help menu
		await page.getByRole("button", { name: "Help" }).click();

		// Click About
		await page.getByText("About").click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="about-modal"], .modal'),
		).toBeVisible();

		// Close modal (either by close button or clicking outside)
		const closeButton = page.locator(
			'[data-testid="modal-close"], .modal-close, [aria-label="Close"]',
		);
		if (await closeButton.isVisible()) {
			await closeButton.click();
		} else {
			await page.keyboard.press("Escape");
		}

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="about-modal"], .modal'),
		).not.toBeVisible();
	});

	test("should open and close File modal", async ({ page }) => {
		// Open File menu
		await page.getByRole("button", { name: "File" }).click();

		// Click Import or Open
		await page.getByText("Import").click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="file-modal"], .modal'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="file-modal"], .modal'),
		).not.toBeVisible();
	});

	test("should open and close Export modal", async ({ page }) => {
		// Open File menu
		await page.getByRole("button", { name: "File" }).click();

		// Click Export
		await page.getByText("Export").click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="export-modal"], .modal'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="export-modal"], .modal'),
		).not.toBeVisible();
	});

	test("should open and close Generate modal", async ({ page }) => {
		// Open Generate menu
		await page.getByRole("button", { name: "Generate" }).click();

		// Click on a generate option (e.g., Tone)
		await page.getByText("Tone").click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="generate-modal"], .modal'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="generate-modal"], .modal'),
		).not.toBeVisible();
	});

	test("should open and close Effect modal", async ({ page }) => {
		// Open Effect menu
		await page.getByRole("button", { name: "Effect" }).click();

		// Click on an effect option (e.g., Amplify)
		await page.getByText("Amplify").click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="effect-modal"], .modal'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="effect-modal"], .modal'),
		).not.toBeVisible();
	});

	test("should open and close Preferences modal", async ({ page }) => {
		// Open Tools menu
		await page.getByRole("button", { name: "Tools" }).click();

		// Click Preferences
		await page.getByText("Preferences").click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="preferences-modal"], .modal'),
		).toBeVisible();

		// Close modal
		await page.keyboard.press("Escape");

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="preferences-modal"], .modal'),
		).not.toBeVisible();
	});

	test("should handle modal overlay clicks", async ({ page }) => {
		// Open any modal
		await page.getByRole("button", { name: "Help" }).click();
		await page.getByText("About").click();

		// Verify modal is open
		await expect(
			page.locator('[data-testid="about-modal"], .modal'),
		).toBeVisible();

		// Click on overlay (outside modal content)
		await page.locator(".modal-overlay").click({ position: { x: 10, y: 10 } });

		// Verify modal is closed
		await expect(
			page.locator('[data-testid="about-modal"], .modal'),
		).not.toBeVisible();
	});
});
