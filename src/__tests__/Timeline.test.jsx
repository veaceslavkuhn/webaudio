import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import Timeline from "../components/Timeline";
import { AudioProvider } from "../context/AudioContext";

// Mock the useAudioHooks
jest.mock("../hooks/useAudioHooks", () => ({
	useWaveformRenderer: () => ({
		canvasRef: { current: null },
		renderer: null,
	}),
	useTimelineInteraction: () => ({}),
}));

// Wrapper component with AudioProvider
const TimelineWrapper = ({ children }) => (
	<AudioProvider>{children}</AudioProvider>
);

describe("Timeline Component", () => {
	beforeEach(() => {
		// Mock canvas methods
		HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
			clearRect: jest.fn(),
			fillRect: jest.fn(),
			fillText: jest.fn(),
			measureText: jest.fn(() => ({ width: 50 })),
			save: jest.fn(),
			restore: jest.fn(),
			beginPath: jest.fn(),
			moveTo: jest.fn(),
			lineTo: jest.fn(),
			stroke: jest.fn(),
			fill: jest.fn(),
			scale: jest.fn(),
			translate: jest.fn(),
		}));

		HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
			left: 0,
			top: 0,
			width: 800,
			height: 60,
		}));
	});

	it("renders timeline canvas", () => {
		render(
			<TimelineWrapper>
				<Timeline />
			</TimelineWrapper>,
		);

		const canvas = screen.getByTestId("timeline-canvas");
		expect(canvas).toBeInTheDocument();
		expect(canvas.tagName).toBe("CANVAS");
	});

	it("has correct canvas dimensions", () => {
		render(
			<TimelineWrapper>
				<Timeline />
			</TimelineWrapper>,
		);

		const canvas = screen.getByTestId("timeline-canvas");
		expect(canvas).toHaveAttribute("width", "800");
		expect(canvas).toHaveAttribute("height", "60");
	});

	it("applies correct CSS classes", () => {
		render(
			<TimelineWrapper>
				<Timeline />
			</TimelineWrapper>,
		);

		const container = screen.getByTestId("timeline");
		expect(container).toHaveClass("timeline");
	});

	it("handles canvas mouse events", () => {
		render(
			<TimelineWrapper>
				<Timeline />
			</TimelineWrapper>,
		);

		const canvas = screen.getByTestId("timeline-canvas");

		// Test mouse events don't throw errors
		expect(() => {
			fireEvent.mouseDown(canvas, { clientX: 100, clientY: 30 });
			fireEvent.mouseMove(canvas, { clientX: 120, clientY: 30 });
			fireEvent.mouseUp(canvas, { clientX: 120, clientY: 30 });
		}).not.toThrow();
	});

	it("handles wheel events for zooming", () => {
		render(
			<TimelineWrapper>
				<Timeline />
			</TimelineWrapper>,
		);

		const canvas = screen.getByTestId("timeline-canvas");

		// Test wheel event doesn't throw errors
		expect(() => {
			fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
		}).not.toThrow();
	});
	it("handles keyboard events", () => {
		render(
			<TimelineWrapper>
				<Timeline />
			</TimelineWrapper>,
		);

		const canvas = screen.getByTestId("timeline-canvas");

		// Test keyboard events don't throw errors
		expect(() => {
			fireEvent.keyDown(canvas, { key: "ArrowLeft" });
			fireEvent.keyDown(canvas, { key: "ArrowRight" });
			fireEvent.keyDown(canvas, { key: "Space" });
		}).not.toThrow();
	});
});
