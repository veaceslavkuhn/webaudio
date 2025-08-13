import { render, screen } from "@testing-library/react";
import React from "react";
import Toolbar from "../components/Toolbar";
import { AudioProvider } from "../context/AudioContext";

// Wrap component with AudioProvider for testing
const WrappedToolbar = () => (
	<AudioProvider>
		<Toolbar />
	</AudioProvider>
);

describe("Toolbar", () => {
	it("renders transport controls", () => {
		render(<WrappedToolbar />);

		expect(screen.getByTitle("Record")).toBeInTheDocument();
		expect(screen.getByTitle("Stop")).toBeInTheDocument();
		expect(screen.getByTitle("Play")).toBeInTheDocument();
		expect(screen.getByTitle("Skip to Start")).toBeInTheDocument();
		expect(screen.getByTitle("Skip to End")).toBeInTheDocument();
	});

	it("renders tool selection buttons", () => {
		render(<WrappedToolbar />);

		expect(screen.getByTitle("Selection Tool")).toBeInTheDocument();
		expect(screen.getByTitle("Envelope Tool")).toBeInTheDocument();
		expect(screen.getByTitle("Zoom Tool")).toBeInTheDocument();
		expect(screen.getByTitle("Time Shift Tool")).toBeInTheDocument();
	});

	it("renders zoom controls", () => {
		render(<WrappedToolbar />);

		expect(screen.getByTitle("Zoom In")).toBeInTheDocument();
		expect(screen.getByTitle("Zoom Out")).toBeInTheDocument();
		expect(screen.getByTitle("Fit to Width")).toBeInTheDocument();
	});

	it("renders volume controls", () => {
		render(<WrappedToolbar />);

		expect(screen.getByText("Recording Volume:")).toBeInTheDocument();
		expect(screen.getByText("Playback Volume:")).toBeInTheDocument();
	});
});
