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

	it("shows empty project state by default", () => {
		render(<App />);
		// Check for empty project message
		expect(screen.getByText("No audio tracks")).toBeInTheDocument();
		expect(
			screen.getByText("Import audio files to get started"),
		).toBeInTheDocument();
		expect(screen.getByTestId("import-audio-button")).toBeInTheDocument();
	});

	it("renders all main UI sections", () => {
		render(<App />);
		// Check for main sections
		expect(screen.getByTestId("app-container")).toBeInTheDocument();
		expect(screen.getByTestId("menu-bar")).toBeInTheDocument();
		expect(screen.getByTestId("toolbar")).toBeInTheDocument();
		expect(screen.getByTestId("main-content")).toBeInTheDocument();
		expect(screen.getByTestId("status-bar")).toBeInTheDocument();
	});
});
