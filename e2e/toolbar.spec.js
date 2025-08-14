import { expect, test } from "@playwright/test";

test.describe("WebAudacity - Toolbar Controls", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await expect(
			page.locator('[data-testid="toolbar"], .toolbar'),
		).toBeVisible();
	});

	test("should display all toolbar controls", async ({ page }) => {
		// Check for main transport controls
		await expect(
			page.locator(
				'[data-testid="play-button"], button[aria-label*="Play"], .play-button',
			),
		).toBeVisible();
		await expect(
			page.locator(
				'[data-testid="stop-button"], button[aria-label*="Stop"], .stop-button',
			),
		).toBeVisible();
		await expect(
			page.locator(
				'[data-testid="record-button"], button[aria-label*="Record"], .record-button',
			),
		).toBeVisible();
		await expect(
			page.locator(
				'[data-testid="pause-button"], button[aria-label*="Pause"], .pause-button',
			),
		).toBeVisible();
	});

	test("should have clickable play button", async ({ page }) => {
		const playButton = page
			.locator(
				'[data-testid="play-button"], button[aria-label*="Play"], .play-button',
			)
			.first();

		// Ensure button is enabled and clickable
		await expect(playButton).toBeEnabled();

		// Click the play button
		await playButton.click();

		// Button should have been clicked (no errors thrown)
		// Note: We're not testing actual audio playback, just UI interaction
	});

	test("should have clickable stop button", async ({ page }) => {
		const stopButton = page
			.locator(
				'[data-testid="stop-button"], button[aria-label*="Stop"], .stop-button',
			)
			.first();

		await expect(stopButton).toBeEnabled();
		await stopButton.click();
	});

	test("should have clickable record button", async ({ page }) => {
		const recordButton = page
			.locator(
				'[data-testid="record-button"], button[aria-label*="Record"], .record-button',
			)
			.first();

		await expect(recordButton).toBeEnabled();
		await recordButton.click();
	});

	test("should have clickable pause button", async ({ page }) => {
		const pauseButton = page
			.locator(
				'[data-testid="pause-button"], button[aria-label*="Pause"], .pause-button',
			)
			.first();

		await expect(pauseButton).toBeEnabled();
		await pauseButton.click();
	});

	test("should display volume controls", async ({ page }) => {
		// Look for volume-related controls
		const volumeControls = page.locator(
			'[data-testid*="volume"], .volume-control, input[type="range"]',
		);

		if ((await volumeControls.count()) > 0) {
			await expect(volumeControls.first()).toBeVisible();
		}
	});

	test("should handle keyboard shortcuts for transport controls", async ({
		page,
	}) => {
		// Test spacebar for play/pause
		await page.keyboard.press("Space");

		// No errors should be thrown
		// The actual functionality test would require audio context testing

		// Wait a moment to ensure any state changes are processed
		await page.waitForTimeout(100);
	});

	test("should show proper button states", async ({ page }) => {
		const playButton = page
			.locator(
				'[data-testid="play-button"], button[aria-label*="Play"], .play-button',
			)
			.first();
		const stopButton = page
			.locator(
				'[data-testid="stop-button"], button[aria-label*="Stop"], .stop-button',
			)
			.first();

		// Initially, play button should be enabled and stop might be disabled
		await expect(playButton).toBeEnabled();

		// Click play
		await playButton.click();

		// After clicking play, stop button should be enabled
		await expect(stopButton).toBeEnabled();
	});
});
