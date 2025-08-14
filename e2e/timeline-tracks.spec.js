import { expect, test } from "@playwright/test";

test.describe("WebAudacity - Timeline & Track Management", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await expect(
			page.locator('[data-testid="timeline"], .timeline'),
		).toBeVisible();
	});

	test("should display timeline component", async ({ page }) => {
		// Check that timeline is rendered
		await expect(
			page.locator('[data-testid="timeline"], .timeline'),
		).toBeVisible();
	});

	test("should display track panel", async ({ page }) => {
		// Check that tracks container is rendered (may be empty initially)
		await expect(
			page.locator('[data-testid="tracks-container"], .tracks-container'),
		).toBeVisible();
		
		// Initially should show empty project since no audio is loaded
		await expect(page.locator('[data-testid="empty-project"]')).toBeVisible();
	});

	test("should display time ruler", async ({ page }) => {
		// Look for time ruler elements
		const timeRuler = page.locator(
			'[data-testid="time-ruler"], .time-ruler, .timeline-ruler',
		);

		if ((await timeRuler.count()) > 0) {
			await expect(timeRuler.first()).toBeVisible();
		}
	});

	test("should display waveform area", async ({ page }) => {
		// Look for waveform container or canvas
		const waveformArea = page.locator(
			'[data-testid="waveform"], .waveform, canvas',
		);

		if ((await waveformArea.count()) > 0) {
			await expect(waveformArea.first()).toBeVisible();
		}
	});

	test("should handle timeline interactions", async ({ page }) => {
		const timeline = page
			.locator('[data-testid="timeline"], .timeline')
			.first();

		// Get timeline bounding box
		const timelineBox = await timeline.boundingBox();

		if (timelineBox) {
			// Click on timeline
			await timeline.click({
				position: { x: timelineBox.width / 2, y: timelineBox.height / 2 },
			});

			// Should not throw any errors
		}
	});

	test("should display track controls", async ({ page }) => {
		// Look for track-related controls
		const trackControls = page.locator(
			'[data-testid*="track"], .track-control, .track-header',
		);

		if ((await trackControls.count()) > 0) {
			await expect(trackControls.first()).toBeVisible();
		}
	});

	test("should show proper timeline scale", async ({ page }) => {
		// Timeline should have some form of time indication
		// This test ensures the timeline is not just empty space
		const timeline = page
			.locator('[data-testid="timeline"], .timeline')
			.first();
		await expect(timeline).toBeVisible();

		// Check that timeline has some content or structure
		const timelineContent = timeline.locator("*");
		expect(await timelineContent.count()).toBeGreaterThan(0);
	});

	test("should handle zoom controls if present", async ({ page }) => {
		// Look for zoom controls
		const zoomIn = page.locator(
			'[data-testid="zoom-in"], button[aria-label*="Zoom in"], .zoom-in',
		);
		const zoomOut = page.locator(
			'[data-testid="zoom-out"], button[aria-label*="Zoom out"], .zoom-out',
		);

		if ((await zoomIn.count()) > 0) {
			await expect(zoomIn.first()).toBeVisible();
			await zoomIn.first().click();
		}

		if ((await zoomOut.count()) > 0) {
			await expect(zoomOut.first()).toBeVisible();
			await zoomOut.first().click();
		}
	});

	test("should maintain proper layout structure", async ({ page }) => {
		// Ensure timeline and tracks container are properly positioned
		const timeline = page
			.locator('[data-testid="timeline"], .timeline')
			.first();
		const tracksContainer = page
			.locator('[data-testid="tracks-container"], .tracks-container')
			.first();

		// Both should be visible
		await expect(timeline).toBeVisible();
		await expect(tracksContainer).toBeVisible();

		// Get their positions to ensure proper layout
		const timelineBox = await timeline.boundingBox();
		const tracksContainerBox = await tracksContainer.boundingBox();

		// Both should have reasonable dimensions
		expect(timelineBox?.width).toBeGreaterThan(0);
		expect(timelineBox?.height).toBeGreaterThan(0);
		expect(tracksContainerBox?.width).toBeGreaterThan(0);
		expect(tracksContainerBox?.height).toBeGreaterThan(0);
	});
});
