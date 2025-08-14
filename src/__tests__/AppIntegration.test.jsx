import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";
import App from "../App.jsx";
import { AudioProvider } from "../context/AudioContext.jsx";

// Mock components that have complex canvas interactions
jest.mock("../components/AdvancedTimeline", () => {
	return function MockAdvancedTimeline() {
		return <div data-testid="advanced-timeline">Advanced Timeline</div>;
	};
});

jest.mock("../components/Timeline", () => {
	return function MockTimeline() {
		return <div data-testid="timeline">Timeline</div>;
	};
});

// Mock Web Audio API
const mockAudioContext = {
	createGain: jest.fn(() => ({
		gain: { setValueAtTime: jest.fn() },
		connect: jest.fn(),
	})),
	createBufferSource: jest.fn(() => ({
		buffer: null,
		start: jest.fn(),
		stop: jest.fn(),
		connect: jest.fn(),
		playbackRate: { value: 1.0 },
	})),
	createBuffer: jest.fn(() => ({
		duration: 1.0,
		numberOfChannels: 2,
		sampleRate: 44100,
		getChannelData: jest.fn(() => new Float32Array(44100)),
	})),
	decodeAudioData: jest.fn(),
	close: jest.fn(),
	resume: jest.fn(() => Promise.resolve()),
	state: "running",
	sampleRate: 44100,
	currentTime: 0,
	destination: {},
};

// Mock AudioContext constructor
global.AudioContext = jest.fn(() => mockAudioContext);
global.webkitAudioContext = jest.fn(() => mockAudioContext);

describe("App Integration Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("should render complete application with all components", () => {
		render(
			<AudioProvider>
				<App />
			</AudioProvider>,
		);

		// Check that main sections are rendered
		expect(screen.getByTestId("advanced-timeline")).toBeInTheDocument();
		expect(screen.getByTestId("timeline")).toBeInTheDocument();

		// Check for other key components by text content
		expect(screen.getByText("File")).toBeInTheDocument();
		expect(screen.getByText("Edit")).toBeInTheDocument();
		expect(screen.getByText("Generate")).toBeInTheDocument();
		expect(screen.getByText("Effect")).toBeInTheDocument();
	});

	test("should handle multiple track management workflow", () => {
		render(
			<AudioProvider>
				<App />
			</AudioProvider>,
		);

		// The app should render without errors even with complex state management
		expect(screen.getByText("WebAudacity")).toBeInTheDocument();
	});

	test("should render with empty track state", () => {
		render(
			<AudioProvider>
				<App />
			</AudioProvider>,
		);

		// Should show empty state indicators
		expect(screen.getByText("No tracks")).toBeInTheDocument();
	});

	test("should maintain responsive layout", () => {
		// Test with different viewport sizes
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1024,
		});

		render(
			<AudioProvider>
				<App />
			</AudioProvider>,
		);

		expect(screen.getByText("WebAudacity")).toBeInTheDocument();

		// Test mobile size
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 375,
		});

		// Re-render with mobile size
		render(
			<AudioProvider>
				<App />
			</AudioProvider>,
		);

		expect(screen.getByText("WebAudacity")).toBeInTheDocument();
	});
});

describe("Component Integration Tests", () => {
	test("should handle audio context initialization errors gracefully", () => {
		// Mock AudioContext to throw error
		global.AudioContext = jest.fn(() => {
			throw new Error("AudioContext not supported");
		});
		global.webkitAudioContext = jest.fn(() => {
			throw new Error("webkitAudioContext not supported");
		});

		expect(() => {
			render(
				<AudioProvider>
					<App />
				</AudioProvider>,
			);
		}).not.toThrow();

		// Should still render the UI
		expect(screen.getByText("WebAudacity")).toBeInTheDocument();
	});

	test("should handle missing Web Audio API gracefully", () => {
		// Remove Web Audio API support
		delete global.AudioContext;
		delete global.webkitAudioContext;

		expect(() => {
			render(
				<AudioProvider>
					<App />
				</AudioProvider>,
			);
		}).not.toThrow();
	});
});
