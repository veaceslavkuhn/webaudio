import { render, screen } from "@testing-library/react";
import React from "react";
import App from "../App";

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

describe("App", () => {
	it("renders without crashing and shows main UI", () => {
		render(<App />);
		// Check if the app renders basic UI components
		expect(screen.getByText("File")).toBeInTheDocument();
		expect(screen.getByText("Edit")).toBeInTheDocument();
		expect(screen.getByTitle("Record")).toBeInTheDocument();
		expect(screen.getByTitle("Play")).toBeInTheDocument();
	});
});
