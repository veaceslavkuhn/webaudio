import { render } from "@testing-library/react";
import React from "react";
import TrackPanel from "../components/TrackPanel";
import { AudioProvider } from "../context/AudioContext";

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

// Mock the useAudioHooks
jest.mock("../hooks/useAudioHooks", () => ({
	useTrackInteraction: () => ({}),
}));

// Wrapper component with AudioProvider
const TrackPanelWrapper = ({ children }) => (
	<AudioProvider>{children}</AudioProvider>
);

const mockTrack = {
	id: "track-1",
	name: "Test Track",
	buffer: null,
	isPlaying: false,
	isSolo: false,
	isMuted: false,
	volume: 80,
	pan: 0,
	effects: [],
	duration: 1.0,
	sampleRate: 44100,
	channels: 2,
};

describe("TrackPanel Component", () => {
	it("renders track panel", () => {
		render(
			<TrackPanelWrapper>
				<TrackPanel track={mockTrack} />
			</TrackPanelWrapper>,
		);

		const trackPanel = document.querySelector(".track-panel");
		expect(trackPanel).toBeInTheDocument();
	});

	it("renders without crashing", () => {
		expect(() => {
			render(
				<TrackPanelWrapper>
					<TrackPanel track={mockTrack} />
				</TrackPanelWrapper>,
			);
		}).not.toThrow();
	});

	it("handles track props correctly", () => {
		const { rerender } = render(
			<TrackPanelWrapper>
				<TrackPanel track={mockTrack} />
			</TrackPanelWrapper>,
		);

		const updatedTrack = { ...mockTrack, name: "Updated Track" };

		expect(() => {
			rerender(
				<TrackPanelWrapper>
					<TrackPanel track={updatedTrack} />
				</TrackPanelWrapper>,
			);
		}).not.toThrow();
	});
});
