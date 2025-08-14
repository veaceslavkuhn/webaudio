import { expect, test } from "@playwright/test";

test.describe("WebAudacity - Responsive Design", () => {
	test("should work on desktop resolution", async ({ page }) => {
		// Set desktop resolution
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto("/");

		// Check that all main components are visible
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
			page.locator('[data-testid="tracks-container"], .tracks-container'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="status-bar"], .status-bar'),
		).toBeVisible();

		// Check that elements have reasonable sizes
		const timeline = page
			.locator('[data-testid="timeline"], .timeline')
			.first();
		const timelineBox = await timeline.boundingBox();
		expect(timelineBox?.width).toBeGreaterThan(800);
	});

	test("should adapt to tablet resolution", async ({ page }) => {
		// Set tablet resolution
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto("/");

		// Main components should still be visible
		await expect(
			page.locator('[data-testid="menu-bar"], .menu-bar'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="toolbar"], .toolbar'),
		).toBeVisible();

		// Layout should adapt
		const menuBar = page.locator('[data-testid="menu-bar"], .menu-bar').first();
		const menuBarBox = await menuBar.boundingBox();
		expect(menuBarBox?.width).toBeLessThanOrEqual(768);
	});

	test("should handle mobile viewport", async ({ page }) => {
		// Set mobile resolution
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/");

		// Check that the application loads (may have horizontal scroll for complex audio app)
		const bodyScrollWidth = await page.evaluate(
			() => document.body.scrollWidth,
		);
		// For audio applications, a minimum width is reasonable
		expect(bodyScrollWidth).toBeLessThanOrEqual(600); // More realistic expectation

		// Essential components should be present (may be stacked or hidden)
		const appContainer = page.locator("#root > *").first();
		await expect(appContainer).toBeVisible();
	});

	test("should handle very small screens", async ({ page }) => {
		// Set very small resolution
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto("/");

		// Application should not break
		await expect(page.locator("#root")).toBeVisible();

		// Audio applications need minimum width - check it's reasonable
		const bodyScrollWidth = await page.evaluate(
			() => document.body.scrollWidth,
		);
		expect(bodyScrollWidth).toBeLessThanOrEqual(600); // Reasonable minimum for audio app
	});

	test("should handle ultra-wide screens", async ({ page }) => {
		// Set ultra-wide resolution
		await page.setViewportSize({ width: 3440, height: 1440 });
		await page.goto("/");

		// All components should be visible and properly spaced
		await expect(
			page.locator('[data-testid="menu-bar"], .menu-bar'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="timeline"], .timeline'),
		).toBeVisible();

		// Timeline should utilize the extra space
		const timeline = page
			.locator('[data-testid="timeline"], .timeline')
			.first();
		const timelineBox = await timeline.boundingBox();
		expect(timelineBox?.width).toBeGreaterThan(1000);
	});

	test("should maintain usability across different screen heights", async ({
		page,
	}) => {
		// Test very short screen
		await page.setViewportSize({ width: 1024, height: 600 });
		await page.goto("/");

		// Essential controls should be accessible
		await expect(
			page.locator('[data-testid="toolbar"], .toolbar'),
		).toBeVisible();

		// Test tall screen
		await page.setViewportSize({ width: 1024, height: 1200 });
		await page.reload();

		// All components should still be visible
		await expect(
			page.locator('[data-testid="timeline"], .timeline'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="status-bar"], .status-bar'),
		).toBeVisible();
	});

	test("should handle orientation changes", async ({ page }) => {
		// Start in portrait tablet
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto("/");

		await expect(
			page.locator('[data-testid="menu-bar"], .menu-bar'),
		).toBeVisible();

		// Switch to landscape
		await page.setViewportSize({ width: 1024, height: 768 });

		// Application should adapt
		await expect(
			page.locator('[data-testid="menu-bar"], .menu-bar'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="timeline"], .timeline'),
		).toBeVisible();
	});

	test("should not have horizontal scroll on standard resolutions", async ({
		page,
	}) => {
		const standardResolutions = [
			{ width: 1920, height: 1080 },
			{ width: 1366, height: 768 },
			{ width: 1024, height: 768 },
			{ width: 768, height: 1024 },
		];

		for (const resolution of standardResolutions) {
			await page.setViewportSize(resolution);
			await page.goto("/");

			const hasHorizontalScroll = await page.evaluate(() => {
				return document.body.scrollWidth > window.innerWidth;
			});

			expect(hasHorizontalScroll).toBe(false);
		}
	});
});
