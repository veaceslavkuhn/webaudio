import { renderHook } from "@testing-library/react";
import React from "react";
import { AudioProvider } from "../context/AudioContext";
import {
	useFileDrop,
	useKeyboardShortcuts,
	useWaveformRenderer,
} from "../hooks/useAudioHooks";

// Mock AudioContext and dependencies
global.AudioContext = jest.fn().mockImplementation(() => ({
	createGain: jest.fn().mockReturnValue({
		connect: jest.fn(),
		disconnect: jest.fn(),
		gain: { value: 1 },
	}),
	createAnalyser: jest.fn().mockReturnValue({
		connect: jest.fn(),
		disconnect: jest.fn(),
		frequencyBinCount: 1024,
		getFloatFrequencyData: jest.fn(),
		getByteFrequencyData: jest.fn(),
	}),
	createBuffer: jest.fn(),
	createBufferSource: jest.fn().mockReturnValue({
		connect: jest.fn(),
		start: jest.fn(),
		stop: jest.fn(),
		buffer: null,
	}),
	destination: {},
	sampleRate: 44100,
	currentTime: 0,
	state: 'running',
	resume: jest.fn().mockResolvedValue(),
	close: jest.fn().mockResolvedValue(),
}));

// Mock MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation(() => ({
	start: jest.fn(),
	stop: jest.fn(),
	addEventListener: jest.fn(),
	removeEventListener: jest.fn(),
	state: 'inactive',
}));

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
	value: {
		getUserMedia: jest.fn().mockResolvedValue({
			getTracks: jest.fn().mockReturnValue([]),
		}),
	},
	writable: true,
});

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

// Wrapper component - use the real AudioProvider for proper context
const wrapper = ({ children }) => React.createElement(AudioProvider, null, children);

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
