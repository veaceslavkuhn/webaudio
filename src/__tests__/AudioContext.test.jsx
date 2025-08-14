import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { AudioProvider, useAudioState } from "../context/AudioContext";

// Mock the audio services to prevent infinite loops
jest.mock("../services/AudioEngine", () => ({
	AudioEngineService: jest.fn().mockImplementation(() => ({
		initializeAudioContext: jest.fn().mockResolvedValue(true),
		destroy: jest.fn(),
		onPlaybackFinished: null,
		onRecordingFinished: null,
		onError: null,
		onStatusChange: null,
	})),
}));

jest.mock("../services/EffectsProcessor", () => ({
	EffectsProcessorService: jest.fn().mockImplementation(() => ({})),
}));

// Test component to check context
const TestComponent = () => {
	const state = useAudioState();
	return (
		<div>
			<span data-testid="status">{state.status}</span>
			<span data-testid="isInitialized">{state.isInitialized.toString()}</span>
			<span data-testid="tracksCount">{state.tracks.size}</span>
		</div>
	);
};

describe("AudioContext", () => {
	it("provides initial state correctly", async () => {
		render(
			<AudioProvider>
				<TestComponent />
			</AudioProvider>,
		);

		// Wait for audio context to initialize with timeout
		await waitFor(
			() => {
				expect(screen.getByTestId("status")).toBeInTheDocument();
			},
			{ timeout: 5000 },
		);

		// Check that provider is working
		expect(screen.getByTestId("isInitialized")).toBeInTheDocument();
		expect(screen.getByTestId("tracksCount")).toHaveTextContent("0");
	});

	it("throws error when used outside provider", () => {
		// Suppress console.error for this test
		const originalError = console.error;
		console.error = jest.fn();

		expect(() => {
			render(<TestComponent />);
		}).toThrow("useAudioState must be used within AudioProvider");

		console.error = originalError;
	});
});
