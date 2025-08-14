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
			"File",
			"Edit",
			"Generate",
			"Effect",
			"Analyze",
			"Tools",
			"Help",
		];

		for (const menuItem of expectedMenuItems) {
			await expect(page.getByRole("button", { name: menuItem })).toBeVisible();
		}
	});

	test("should open and close File menu", async ({ page }) => {
		const fileButton = page.getByRole("button", { name: "File" });

		// Click to open the File menu
		await fileButton.click();

		// Verify menu is open (check for common file menu items)
		await expect(page.getByText("Import")).toBeVisible();
		await expect(page.getByText("Export")).toBeVisible();

		// Close menu by clicking elsewhere or pressing Escape
		await page.keyboard.press("Escape");

		// Verify menu is closed
		await expect(page.getByText("Import")).not.toBeVisible();
	});

	test("should open and close Edit menu", async ({ page }) => {
		const editButton = page.getByRole("button", { name: "Edit" });

		await editButton.click();

		// Check for common edit menu items
		await expect(page.getByText("Undo")).toBeVisible();
		await expect(page.getByText("Redo")).toBeVisible();

		await page.keyboard.press("Escape");
	});

	test("should open and close Generate menu", async ({ page }) => {
		const generateButton = page.getByRole("button", { name: "Generate" });

		await generateButton.click();

		// Check for common generate menu items
		await expect(page.getByText("Tone")).toBeVisible();
		await expect(page.getByText("Noise")).toBeVisible();

		await page.keyboard.press("Escape");
	});

	test("should open and close Effect menu", async ({ page }) => {
		const effectButton = page.getByRole("button", { name: "Effect" });

		await effectButton.click();

		// Check for common effect menu items
		await expect(page.getByText("Amplify")).toBeVisible();
		await expect(page.getByText("Normalize")).toBeVisible();

		await page.keyboard.press("Escape");
	});

	test("should open and close Help menu", async ({ page }) => {
		const helpButton = page.getByRole("button", { name: "Help" });

		await helpButton.click();

		// Check for help menu items
		await expect(page.getByText("About")).toBeVisible();

		await page.keyboard.press("Escape");
	});
});
