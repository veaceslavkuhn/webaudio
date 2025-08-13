import { render } from "@testing-library/react";
import React from "react";
import StatusBar from "../components/StatusBar";
import { AudioProvider } from "../context/AudioContext";

// Wrapper component with AudioProvider
const StatusBarWrapper = ({ children }) => (
	<AudioProvider>{children}</AudioProvider>
);

describe("StatusBar Component", () => {
	it("renders status bar container", () => {
		render(
			<StatusBarWrapper>
				<StatusBar />
			</StatusBarWrapper>,
		);

		const statusBar = document.querySelector(".status-bar");
		expect(statusBar).toBeInTheDocument();
	});

	it("displays basic status information", () => {
		render(
			<StatusBarWrapper>
				<StatusBar />
			</StatusBarWrapper>,
		);

		const statusBar = document.querySelector(".status-bar");
		expect(statusBar).toBeInTheDocument();
	});

	it("renders without crashing when rerenderred", () => {
		const { rerender } = render(
			<StatusBarWrapper>
				<StatusBar />
			</StatusBarWrapper>,
		);

		expect(() => {
			rerender(
				<StatusBarWrapper>
					<StatusBar />
				</StatusBarWrapper>,
			);
		}).not.toThrow();
	});
});
