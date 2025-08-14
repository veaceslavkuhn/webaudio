import { renderHook } from "@testing-library/react";
import React from "react";
import {
	useFileDrop,
	useKeyboardShortcuts,
	useWaveformRenderer,
} from "../hooks/useAudioHooks";

// Mock canvas and Web Audio API
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
	clearRect: jest.fn(),
	fillRect: jest.fn(),
	fillStyle: "",
	strokeStyle: "",
	lineWidth: 1,
	beginPath: jest.fn(),
	moveTo: jest.fn(),
	lineTo: jest.fn(),
	stroke: jest.fn(),
	fill: jest.fn(),
	scale: jest.fn(),
	translate: jest.fn(),
	save: jest.fn(),
	restore: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn(),
}));

// Mock AudioProvider with simpler implementation for testing
const MockAudioProvider = ({ children }) => {
	const mockState = {
		isInitialized: true,
		tracks: new Map(),
		isPlaying: false,
		currentTime: 0,
		selection: { start: null, end: null },
		zoomLevel: 1,
		scrollPosition: 0,
	};

	const mockActions = {
		play: jest.fn(),
		pause: jest.fn(),
		stop: jest.fn(),
	};

	return (
		<div data-testid="mock-provider">
			{React.cloneElement(children, { state: mockState, actions: mockActions })}
		</div>
	);
};

// Wrapper component
const wrapper = ({ children }) => <MockAudioProvider>{children}</MockAudioProvider>;

describe("useAudioHooks", () => {
	describe("useFileDrop", () => {
		it("returns drop handlers", () => {
			const { result } = renderHook(() => useFileDrop(), { wrapper });

			expect(typeof result.current.handleDragOver).toBe("function");
			expect(typeof result.current.handleDrop).toBe("function");
		});
	});

	describe("useKeyboardShortcuts", () => {
		it("sets up keyboard shortcuts", () => {
			expect(() => {
				renderHook(() => useKeyboardShortcuts(), { wrapper });
			}).not.toThrow();
		});
	});

	describe("useWaveformRenderer", () => {
		it("returns canvas ref and renderer", () => {
			const canvasRef = { current: null };
			const timelineCanvasRef = { current: null };
			const { result } = renderHook(() => useWaveformRenderer(canvasRef, timelineCanvasRef), { wrapper });

			expect(result.current).toHaveProperty("addTrack");
			expect(result.current).toHaveProperty("removeTrack");
			expect(result.current).toHaveProperty("formatTime");
			expect(result.current).toHaveProperty("renderer");
		});
	});
});
