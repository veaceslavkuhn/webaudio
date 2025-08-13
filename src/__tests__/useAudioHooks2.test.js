import { renderHook } from "@testing-library/react";
import React from "react";
import { AudioProvider } from "../context/AudioContext";
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

// Wrapper component
const wrapper = ({ children }) => <AudioProvider>{children}</AudioProvider>;

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
