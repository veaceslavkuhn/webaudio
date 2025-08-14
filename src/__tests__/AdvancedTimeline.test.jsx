import { fireEvent, render, screen } from "@testing-library/react";
import AdvancedTimeline from "../components/AdvancedTimeline";
import { AudioProvider } from "../context/AudioContext";

// Mock the audio hooks
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

describe("Advanced Timeline Component", () => {
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
			strokeRect: jest.fn(),
			strokeStyle: "",
			fillStyle: "",
			lineWidth: 1,
			font: "10px Arial",
		}));

		HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
			top: 0,
			left: 0,
			bottom: 60,
			right: 800,
			width: 800,
			height: 60,
			x: 0,
			y: 0,
		}));

		Object.defineProperty(window, "devicePixelRatio", {
			writable: true,
			value: 1,
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("Rendering", () => {
		test("should render advanced timeline component", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			expect(screen.getByText("Snap to Grid")).toBeInTheDocument();
			expect(screen.getByText("Show Beats")).toBeInTheDocument();
			expect(screen.getByText("Set Loop")).toBeInTheDocument();
			expect(screen.getByText("Clear Loop")).toBeInTheDocument();
		});

		test("should render timeline canvas", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const canvas = document.querySelector(".timeline-canvas");
			expect(canvas).toBeInTheDocument();
			expect(canvas.tagName).toBe("CANVAS");
		});

		test("should render control groups", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const controls = document.querySelector(".timeline-controls");
			expect(controls).toBeInTheDocument();

			const controlGroups = document.querySelectorAll(
				".timeline-control-group",
			);
			expect(controlGroups.length).toBeGreaterThan(0);
		});
	});

	describe("Snap to Grid Controls", () => {
		test("should toggle snap to grid", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const snapCheckbox = screen.getByLabelText(/snap to grid/i);
			expect(snapCheckbox).toBeChecked(); // Default is true

			fireEvent.click(snapCheckbox);
			expect(snapCheckbox).not.toBeChecked();

			fireEvent.click(snapCheckbox);
			expect(snapCheckbox).toBeChecked();
		});

		test("should show grid size control when not in beat mode", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			// First turn off beats mode
			const beatsCheckbox = screen.getByLabelText(/show beats/i);
			fireEvent.click(beatsCheckbox);

			// Grid size control should appear
			expect(screen.getByText("Grid Size:")).toBeInTheDocument();

			const gridSelect = screen.getByDisplayValue("1s");
			expect(gridSelect).toBeInTheDocument();
		});

		test("should change grid size", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			// Turn off beats mode to show grid size
			const beatsCheckbox = screen.getByLabelText(/show beats/i);
			fireEvent.click(beatsCheckbox);

			const gridSelect = screen.getByDisplayValue("1s");
			fireEvent.change(gridSelect, { target: { value: "0.5" } });

			expect(gridSelect.value).toBe("0.5");
		});
	});

	describe("Beat Mode Controls", () => {
		test("should toggle beat mode", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const beatsCheckbox = screen.getByLabelText(/show beats/i);
			expect(beatsCheckbox).toBeChecked(); // Default is true

			fireEvent.click(beatsCheckbox);
			expect(beatsCheckbox).not.toBeChecked();
		});

		test("should show BPM and time signature controls in beat mode", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			expect(screen.getByText("BPM:")).toBeInTheDocument();
			expect(screen.getByText("Time Sig:")).toBeInTheDocument();

			const bpmInput = screen.getByDisplayValue("120");
			expect(bpmInput).toBeInTheDocument();

			const timeSigSelect = screen.getByDisplayValue("4/4");
			expect(timeSigSelect).toBeInTheDocument();
		});

		test("should change BPM", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const bpmInput = screen.getByDisplayValue("120");
			fireEvent.change(bpmInput, { target: { value: "140" } });

			expect(bpmInput.value).toBe("140");
		});

		test("should change time signature", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const timeSigSelect = screen.getByDisplayValue("4/4");
			fireEvent.change(timeSigSelect, { target: { value: "3/4" } });

			expect(timeSigSelect.value).toBe("3/4");
		});

		test("should have time signature options", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			// Check that options exist
			expect(screen.getByText("4/4")).toBeInTheDocument();
			expect(screen.getByText("3/4")).toBeInTheDocument();
			expect(screen.getByText("2/4")).toBeInTheDocument();
			expect(screen.getByText("6/8")).toBeInTheDocument();
		});
	});

	describe("Loop Region Controls", () => {
		test("should render loop control buttons", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const setLoopButton = screen.getByText("Set Loop");
			const clearLoopButton = screen.getByText("Clear Loop");

			expect(setLoopButton).toBeInTheDocument();
			expect(clearLoopButton).toBeInTheDocument();
		});

		test("should disable set loop button when no selection", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const setLoopButton = screen.getByText("Set Loop");
			expect(setLoopButton).toBeDisabled();
		});

		test("should disable clear loop button when no loop region", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const clearLoopButton = screen.getByText("Clear Loop");
			expect(clearLoopButton).toBeDisabled();
		});

		test("should click clear loop button", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const clearLoopButton = screen.getByText("Clear Loop");
			fireEvent.click(clearLoopButton);

			// Should not throw error even when disabled
			expect(clearLoopButton).toBeDisabled();
		});
	});

	describe("Canvas Interaction", () => {
		test("should handle canvas click", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const canvas = document.querySelector(".timeline-canvas");

			fireEvent.click(canvas, {
				clientX: 100,
				clientY: 30,
			});

			// Should not throw error
			expect(canvas).toBeInTheDocument();
		});

		test("should have correct canvas styles", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const canvas = document.querySelector(".timeline-canvas");

			expect(canvas.style.width).toBe("100%");
			expect(canvas.style.height).toBe("60px");
			expect(canvas.style.cursor).toBe("crosshair");
			expect(canvas.style.display).toBe("block");
		});
	});

	describe("Responsive Behavior", () => {
		test("should handle window resize", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			// Trigger resize event
			fireEvent(window, new Event("resize"));

			// Should not throw error
			const canvas = document.querySelector(".timeline-canvas");
			expect(canvas).toBeInTheDocument();
		});

		test("should maintain aspect ratio", () => {
			render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const canvas = document.querySelector(".timeline-canvas");
			expect(canvas.style.height).toBe("60px");
		});
	});

	describe("Error Handling", () => {
		test("should handle missing canvas context gracefully", () => {
			HTMLCanvasElement.prototype.getContext = jest.fn(() => null);

			expect(() => {
				render(
					<TimelineWrapper>
						<AdvancedTimeline />
					</TimelineWrapper>,
				);
			}).not.toThrow();
		});

		test("should handle canvas measurement errors", () => {
			HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => {
				throw new Error("Measurement error");
			});

			expect(() => {
				render(
					<TimelineWrapper>
						<AdvancedTimeline />
					</TimelineWrapper>,
				);
			}).not.toThrow();
		});
	});

	describe("Integration", () => {
		test("should render without crashing in audio context", () => {
			expect(() => {
				render(
					<TimelineWrapper>
						<AdvancedTimeline />
					</TimelineWrapper>,
				);
			}).not.toThrow();
		});

		test("should maintain state between re-renders", () => {
			const { rerender } = render(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			const snapCheckbox = screen.getByLabelText(/snap to grid/i);
			fireEvent.click(snapCheckbox);

			expect(snapCheckbox).not.toBeChecked();

			rerender(
				<TimelineWrapper>
					<AdvancedTimeline />
				</TimelineWrapper>,
			);

			// State should be maintained
			expect(screen.getByLabelText(/snap to grid/i)).not.toBeChecked();
		});
	});
});
