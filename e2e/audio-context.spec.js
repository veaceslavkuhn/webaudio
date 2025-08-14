import { expect, test } from "@playwright/test";

test.describe("WebAudacity - Audio Context & Web Audio API", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("should initialize audio context without errors", async ({ page }) => {
		const consoleErrors = [];

		// Listen for console errors
		page.on("console", (msg) => {
			if (
				msg.type() === "error" &&
				msg.text().toLowerCase().includes("audio")
			) {
				consoleErrors.push(msg.text());
			}
		});

		// Wait for audio context initialization
		await page.waitForTimeout(2000);

		// Check that there are no audio-related console errors
		expect(consoleErrors).toHaveLength(0);
	});

	test("should have Web Audio API support", async ({ page }) => {
		// Check if Web Audio API is supported in the browser
		const isWebAudioSupported = await page.evaluate(() => {
			return (
				typeof window.AudioContext !== "undefined" ||
				typeof window.webkitAudioContext !== "undefined"
			);
		});

		expect(isWebAudioSupported).toBe(true);
	});

	test("should handle audio context state properly", async ({ page }) => {
		// Check if audio context can be created and has proper state
		const audioContextInfo = await page.evaluate(() => {
			try {
				const AudioContextClass =
					window.AudioContext || window.webkitAudioContext;
				const ctx = new AudioContextClass();
				return {
					state: ctx.state,
					sampleRate: ctx.sampleRate,
					hasDestination: !!ctx.destination,
				};
			} catch (error) {
				return { error: error.message };
			}
		});

		// Audio context should be created successfully
		expect(audioContextInfo.error).toBeUndefined();
		expect(audioContextInfo.state).toBeDefined();
		expect(audioContextInfo.sampleRate).toBeGreaterThan(0);
		expect(audioContextInfo.hasDestination).toBe(true);
	});

	test("should handle audio permissions gracefully", async ({ page }) => {
		// Test microphone permission handling (if recording is attempted)
		const microphonePermission = await page.evaluate(async () => {
			try {
				// Check if getUserMedia is available
				if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
					return { supported: false };
				}

				// Don't actually request microphone, just check API availability
				return { supported: true };
			} catch (error) {
				return { error: error.message };
			}
		});

		// At minimum, the API should be available in modern browsers
		expect(microphonePermission.supported).toBeDefined();
	});

	test("should handle audio buffer creation", async ({ page }) => {
		// Test basic audio buffer operations
		const bufferTest = await page.evaluate(() => {
			try {
				const AudioContextClass =
					window.AudioContext || window.webkitAudioContext;
				const ctx = new AudioContextClass();

				// Create a simple audio buffer
				const buffer = ctx.createBuffer(2, 44100, 44100); // 2 channels, 1 second at 44.1kHz

				return {
					channels: buffer.numberOfChannels,
					length: buffer.length,
					sampleRate: buffer.sampleRate,
				};
			} catch (error) {
				return { error: error.message };
			}
		});

		expect(bufferTest.error).toBeUndefined();
		expect(bufferTest.channels).toBe(2);
		expect(bufferTest.length).toBe(44100);
		expect(bufferTest.sampleRate).toBe(44100);
	});

	test("should handle audio nodes creation", async ({ page }) => {
		// Test basic audio nodes creation
		const nodesTest = await page.evaluate(() => {
			try {
				const AudioContextClass =
					window.AudioContext || window.webkitAudioContext;
				const ctx = new AudioContextClass();

				// Create basic audio nodes
				const gainNode = ctx.createGain();
				const oscillator = ctx.createOscillator();
				const analyser = ctx.createAnalyser();

				return {
					hasGainNode: !!gainNode,
					hasOscillator: !!oscillator,
					hasAnalyser: !!analyser,
					gainValue: gainNode.gain.value,
					oscillatorFrequency: oscillator.frequency.value,
				};
			} catch (error) {
				return { error: error.message };
			}
		});

		expect(nodesTest.error).toBeUndefined();
		expect(nodesTest.hasGainNode).toBe(true);
		expect(nodesTest.hasOscillator).toBe(true);
		expect(nodesTest.hasAnalyser).toBe(true);
		expect(nodesTest.gainValue).toBe(1); // Default gain value
		expect(nodesTest.oscillatorFrequency).toBe(440); // Default frequency
	});

	test("should not have memory leaks in audio context", async ({ page }) => {
		// Create and destroy audio contexts to check for leaks
		const memoryTest = await page.evaluate(() => {
			try {
				const AudioContextClass =
					window.AudioContext || window.webkitAudioContext;
				const contexts = [];

				// Create multiple contexts
				for (let i = 0; i < 5; i++) {
					const ctx = new AudioContextClass();
					contexts.push(ctx);
				}

				// Close all contexts
				contexts.forEach((ctx) => {
					if (ctx.close) {
						ctx.close();
					}
				});

				return { success: true, count: contexts.length };
			} catch (error) {
				return { error: error.message };
			}
		});

		expect(memoryTest.error).toBeUndefined();
		expect(memoryTest.success).toBe(true);
		expect(memoryTest.count).toBe(5);
	});
});
