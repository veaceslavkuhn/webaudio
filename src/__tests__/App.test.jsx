import { render, screen } from "@testing-library/react";
import React from "react";
import App from "../App";

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
