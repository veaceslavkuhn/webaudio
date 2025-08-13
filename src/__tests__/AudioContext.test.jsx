import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { AudioProvider, useAudioState } from "../context/AudioContext";

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

		// Wait for audio context to initialize
		await waitFor(() => {
			expect(screen.getByTestId("status")).toHaveTextContent("Ready");
		});

		expect(screen.getByTestId("isInitialized")).toHaveTextContent("true");
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
